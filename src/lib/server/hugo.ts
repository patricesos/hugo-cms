import { spawn, type ChildProcess } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { getCmsConfig } from './config';

export interface HugoStatus {
	running: boolean;
	url: string | null;
	port: number;
	error: string | null;
	live: boolean;
}

export interface LogEntry {
	stream: 'stdout' | 'stderr';
	text: string;
	timestamp: number;
}

export const MAX_LOG_ENTRIES = 2000;

/**
 * Résout le chemin du binaire Hugo avec la priorité suivante :
 *   1. Variable d'environnement HUGO_BINARY_PATH
 *   2. bin/hugo(.exe) — binaire portable à côté du CMS (dev + dist)
 *   3. 'hugo' dans le PATH système (fallback)
 */
export function resolveHugoBinary(): string {
	const cfg = getCmsConfig();
	if (cfg.hugoBinaryPath) return cfg.hugoBinaryPath;

	const binaryName = process.platform === 'win32' ? 'hugo.exe' : 'hugo';
	const localBinary = resolve(process.cwd(), 'bin', binaryName);
	if (existsSync(localBinary)) return localBinary;

	return 'hugo';
}

/** État mutable du module — encapsulé pour éviter les variables globales éparses. */
const state = {
	/** Override runtime pour l'adresse de bind (null = valeur de config). */
	runtimeBindAddress: null as string | null,
	/** Buffer circulaire des logs Hugo. */
	logBuffer: [] as LogEntry[],
	/** Processus Hugo en cours d'exécution. */
	hugoProcess: null as ChildProcess | null,
	/** URL du serveur Hugo une fois démarré. */
	hugoUrl: null as string | null,
	/** Dernière erreur Hugo. */
	hugoError: null as string | null,
	/** Mutex anti-concurrence pour le démarrage. */
	startPromise: null as Promise<HugoStatus> | null,
};

export function getLogs(): LogEntry[] {
	return state.logBuffer;
}

export function clearLogs(): void {
	state.logBuffer = [];
}

function pushLog(stream: 'stdout' | 'stderr', text: string): void {
	state.logBuffer.push({ stream, text, timestamp: Date.now() });
	if (state.logBuffer.length > MAX_LOG_ENTRIES) {
		state.logBuffer = state.logBuffer.slice(-MAX_LOG_ENTRIES);
	}
}

/** Renvoie l'adresse de bind effective (runtime override ou config persistante). */
export function getEffectiveBindAddress(): string {
	return state.runtimeBindAddress ?? getCmsConfig().hugoBindAddress;
}

/** Surcharge l'adresse de bind pour le prochain démarrage (runtime uniquement). */
export function setRuntimeBindAddress(address: string): void {
	state.runtimeBindAddress = address;
}

/** Réinitialise l'override runtime : revient à la valeur de la config persistante. */
export function clearRuntimeBindAddress(): void {
	state.runtimeBindAddress = null;
}

function findHugoRoot(): string {
	return getCmsConfig().hugoSitePath;
}

export function getHugoStatus(): HugoStatus {
	return {
		running: state.hugoProcess !== null && state.hugoProcess.exitCode === null,
		url: state.hugoUrl,
		port: getCmsConfig().hugoServerPort,
		error: state.hugoError,
		live: getEffectiveBindAddress() !== '127.0.0.1',
	};
}

export async function startHugoServer(): Promise<HugoStatus> {
	if (state.hugoProcess && state.hugoProcess.exitCode === null) {
		return getHugoStatus();
	}
	if (state.startPromise) return state.startPromise;

	state.hugoError = null;
	const root = findHugoRoot() || resolve(getCmsConfig().hugoContentPath, '..');
	const port = getCmsConfig().hugoServerPort;

	const proc = spawn(resolveHugoBinary(), [
		'server',
		'-D',
		'--port', String(port),
		'--bind', getEffectiveBindAddress(),
		'--source', root,
		'--disableFastRender',
	], {
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});

	state.startPromise = new Promise<HugoStatus>((resolvePromise) => {
		const timeout = setTimeout(() => {
			state.hugoError = "Le serveur Hugo n'a pas démarré dans les temps.";
			state.startPromise = null;
			resolvePromise(getHugoStatus());
		}, getCmsConfig().hugoStartupTimeout);

		proc.stdout?.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
			const trimmed = text.trimEnd();
			console.log(`[hugo] ${trimmed}`);
			pushLog('stdout', trimmed);
			const portMatch = text.match(/Web Server is available at (\S+)/);
			if (portMatch) state.hugoUrl = portMatch[1];
			const envMatch = text.match(/listening on (\S+)/i);
			if (envMatch) state.hugoUrl = envMatch[1];
			if (state.hugoUrl) {
				clearTimeout(timeout);
				state.hugoProcess = proc;
				state.startPromise = null;
				resolvePromise(getHugoStatus());
			}
		});

		proc.stderr?.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
			const trimmed = text.trimEnd();
			console.error(`[hugo:err] ${trimmed}`);
			pushLog('stderr', trimmed);
			if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
				state.hugoError = text.trim();
			}
		});

		proc.on('error', (err) => {
			clearTimeout(timeout);
			state.hugoError = err.message;
			state.hugoProcess = null;
			state.startPromise = null;
			resolvePromise(getHugoStatus());
		});

		proc.on('exit', (code) => {
			clearTimeout(timeout);
			if (code !== 0 && !state.hugoUrl) {
				state.hugoError = state.hugoError || `Hugo s'est arrêté (code ${code}).`;
			}
			state.hugoProcess = null;
			state.startPromise = null;
			resolvePromise(getHugoStatus());
		});
	});

	return state.startPromise;
}

export async function stopHugoServer(): Promise<HugoStatus> {
	if (state.hugoProcess && state.hugoProcess.exitCode === null) {
		state.hugoProcess.kill('SIGTERM');

		return new Promise((resolvePromise) => {
			const timeout = setTimeout(() => {
				state.hugoProcess?.kill('SIGKILL');
				state.hugoProcess = null;
				state.hugoUrl = null;
				state.hugoError = null;
				resolvePromise(getHugoStatus());
			}, getCmsConfig().hugoStopTimeout);

			state.hugoProcess!.on('exit', () => {
				clearTimeout(timeout);
				state.hugoProcess = null;
				state.hugoUrl = null;
				state.hugoError = null;
				resolvePromise(getHugoStatus());
			});
		});
	}

	state.hugoProcess = null;
	state.hugoUrl = null;
	state.hugoError = null;
	return getHugoStatus();
}

export async function restartHugoServer(): Promise<HugoStatus> {
	const wasRunning = state.hugoProcess !== null && state.hugoProcess.exitCode === null;
	if (wasRunning) {
		await stopHugoServer();
	}
	return startHugoServer();
}

/** Pour les tests : réinitialise tout l'état du module. */
export function __resetHugoStateForTests(): void {
	state.hugoProcess = null;
	state.hugoUrl = null;
	state.hugoError = null;
	state.startPromise = null;
	state.logBuffer = [];
	state.runtimeBindAddress = null;
}
