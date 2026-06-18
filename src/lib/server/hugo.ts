import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { getCmsConfig } from './config';

/**
 * Override runtime pour l'adresse de bind sans toucher à la config persistante.
 * `null` = on utilise la valeur de la config (getCmsConfig().hugoBindAddress).
 */
let runtimeBindAddress: string | null = null;

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
let logBuffer: LogEntry[] = [];

export function getLogs(): LogEntry[] {
	return logBuffer;
}

export function clearLogs(): void {
	logBuffer = [];
}

function pushLog(stream: 'stdout' | 'stderr', text: string): void {
	logBuffer.push({ stream, text, timestamp: Date.now() });
	if (logBuffer.length > MAX_LOG_ENTRIES) {
		logBuffer = logBuffer.slice(-MAX_LOG_ENTRIES);
	}
}

let hugoProcess: ChildProcess | null = null;
let hugoUrl: string | null = null;
let hugoError: string | null = null;

/** Renvoie l'adresse de bind effective (runtime override ou config persistante). */
export function getEffectiveBindAddress(): string {
	return runtimeBindAddress ?? getCmsConfig().hugoBindAddress;
}

/** Surcharge l'adresse de bind pour le prochain démarrage (runtime uniquement). */
export function setRuntimeBindAddress(address: string): void {
	runtimeBindAddress = address;
}

/** Réinitialise l'override runtime : revient à la valeur de la config persistante. */
export function clearRuntimeBindAddress(): void {
	runtimeBindAddress = null;
}

function findHugoRoot(): string | null {
	const site = getCmsConfig().hugoSitePath;
	if (
		existsSync(resolve(site, 'hugo.toml')) ||
		existsSync(resolve(site, 'hugo.yaml')) ||
		existsSync(resolve(site, 'hugo.json')) ||
		existsSync(resolve(site, 'config.toml')) ||
		existsSync(resolve(site, 'config.yaml')) ||
		existsSync(resolve(site, 'config.json'))
	) {
		return site;
	}
	return site;
}

export function getHugoStatus(): HugoStatus {
	return {
		running: hugoProcess !== null && hugoProcess.exitCode === null,
		url: hugoUrl,
		port: getCmsConfig().hugoServerPort,
		error: hugoError,
		live: getEffectiveBindAddress() !== '127.0.0.1',
	};
}

let startPromise: Promise<HugoStatus> | null = null;

export async function startHugoServer(): Promise<HugoStatus> {
	if (hugoProcess && hugoProcess.exitCode === null) {
		return getHugoStatus();
	}
	if (startPromise) return startPromise;

	hugoError = null;
	const root = findHugoRoot() || resolve(getCmsConfig().hugoContentPath, '..');
	const port = getCmsConfig().hugoServerPort;

	const proc = spawn('hugo', [
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

	startPromise = new Promise<HugoStatus>((resolvePromise) => {
		const timeout = setTimeout(() => {
			hugoError = "Le serveur Hugo n'a pas démarré dans les temps.";
			startPromise = null;
			resolvePromise(getHugoStatus());
		}, getCmsConfig().hugoStartupTimeout);

		proc.stdout?.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
			const trimmed = text.trimEnd();
			console.log(`[hugo] ${trimmed}`);
			pushLog('stdout', trimmed);
			const portMatch = text.match(/Web Server is available at (\S+)/);
			if (portMatch) hugoUrl = portMatch[1];
			const envMatch = text.match(/listening on (\S+)/i);
			if (envMatch) hugoUrl = envMatch[1];
			if (hugoUrl) {
				clearTimeout(timeout);
				hugoProcess = proc;
				startPromise = null;
				resolvePromise(getHugoStatus());
			}
		});

		proc.stderr?.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
			const trimmed = text.trimEnd();
			console.error(`[hugo:err] ${trimmed}`);
			pushLog('stderr', trimmed);
			if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
				hugoError = text.trim();
			}
		});

		proc.on('error', (err) => {
			clearTimeout(timeout);
			hugoError = err.message;
			hugoProcess = null;
			startPromise = null;
			resolvePromise(getHugoStatus());
		});

		proc.on('exit', (code) => {
			clearTimeout(timeout);
			if (code !== 0 && !hugoUrl) {
				hugoError = hugoError || `Hugo s'est arrêté (code ${code}).`;
			}
			hugoProcess = null;
			startPromise = null;
			resolvePromise(getHugoStatus());
		});
	});

	return startPromise;
}

export async function stopHugoServer(): Promise<HugoStatus> {
	if (hugoProcess && hugoProcess.exitCode === null) {
		hugoProcess.kill('SIGTERM');

		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				hugoProcess?.kill('SIGKILL');
				hugoProcess = null;
				hugoUrl = null;
				hugoError = null;
				resolve(getHugoStatus());
			}, getCmsConfig().hugoStopTimeout);

			hugoProcess!.on('exit', () => {
				clearTimeout(timeout);
				hugoProcess = null;
				hugoUrl = null;
				hugoError = null;
				resolve(getHugoStatus());
			});
		});
	}

	hugoProcess = null;
	hugoUrl = null;
	hugoError = null;
	return getHugoStatus();
}

export async function restartHugoServer(): Promise<HugoStatus> {
	const wasRunning = hugoProcess !== null && hugoProcess.exitCode === null;
	if (wasRunning) {
		await stopHugoServer();
	}
	return startHugoServer();
}

/** Pour les tests : réinitialise tout l'état du module. */
export function __resetHugoStateForTests(): void {
	hugoProcess = null;
	hugoUrl = null;
	hugoError = null;
	startPromise = null;
	logBuffer = [];
	runtimeBindAddress = null;
}
