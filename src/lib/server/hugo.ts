import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { cmsConfig } from './config';

interface HugoStatus {
	running: boolean;
	url: string | null;
	port: number;
	error: string | null;
}

let hugoProcess: ChildProcess | null = null;
let hugoUrl: string | null = null;
let hugoError: string | null = null;

function findHugoRoot(): string | null {
	let dir = resolve(cmsConfig.hugoContentPath);
	for (let i = 0; i < 10; i++) {
		dir = resolve(dir, '..');
		if (
			existsSync(resolve(dir, 'hugo.toml')) ||
			existsSync(resolve(dir, 'hugo.yaml')) ||
			existsSync(resolve(dir, 'hugo.json')) ||
			existsSync(resolve(dir, 'config.toml')) ||
			existsSync(resolve(dir, 'config.yaml')) ||
			existsSync(resolve(dir, 'config.json'))
		) {
			return dir;
		}
	}
	return resolve(cmsConfig.hugoContentPath, '..');
}

export function getHugoStatus(): HugoStatus {
	return {
		running: hugoProcess !== null && hugoProcess.exitCode === null,
		url: hugoUrl,
		port: cmsConfig.hugoServerPort,
		error: hugoError,
	};
}

let startPromise: Promise<HugoStatus> | null = null;

export async function startHugoServer(): Promise<HugoStatus> {
	if (hugoProcess && hugoProcess.exitCode === null) {
		return getHugoStatus();
	}
	if (startPromise) return startPromise;

	hugoError = null;
	const root = findHugoRoot() || resolve(cmsConfig.hugoContentPath, '..');
	const port = cmsConfig.hugoServerPort;

	const proc = spawn('hugo', [
		'server',
		'-D',
		'--port', String(port),
		'--bind', cmsConfig.hugoBindAddress,
		'--baseURL', `http://${cmsConfig.hugoBindAddress}:${port}`,
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
		}, cmsConfig.hugoStartupTimeout);

		proc.stdout?.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
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
			}, cmsConfig.hugoStopTimeout);

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
