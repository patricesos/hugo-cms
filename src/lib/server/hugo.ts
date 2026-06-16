import { spawn, type ChildProcess } from 'node:child_process';
import { resolve, dirname } from 'node:path';
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
	const candidates = [
		resolve(cmsConfig.hugoContentPath, '..'),
		resolve(cmsConfig.hugoContentPath, '../..'),
	];

	for (const dir of candidates) {
		if (
			existsSync(resolve(dir, 'hugo.toml')) ||
			existsSync(resolve(dir, 'hugo.yaml')) ||
			existsSync(resolve(dir, 'hugo.json')) ||
			existsSync(resolve(dir, 'config.toml'))
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

export async function startHugoServer(): Promise<HugoStatus> {
	if (hugoProcess && hugoProcess.exitCode === null) {
		return getHugoStatus();
	}

	hugoError = null;
	const root = findHugoRoot() || resolve(cmsConfig.hugoContentPath, '..');

	const port = cmsConfig.hugoServerPort;

	hugoProcess = spawn('hugo', [
		'server',
		'-D',
		'--port', String(port),
		'--bind', '127.0.0.1',
		'--baseURL', `http://localhost:${port}`,
		'--source', root,
		'--disableFastRender',
	], {
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});

	return new Promise((resolve) => {
		const timeout = setTimeout(() => {
			hugoError = "Le serveur Hugo n'a pas démarré dans les temps.";
			resolve(getHugoStatus());
		}, 15000);

		hugoProcess!.stdout?.on('data', (chunk: Buffer) => {
			const text = chunk.toString();

			const portMatch = text.match(/Web Server is available at (\S+)/);
			if (portMatch) {
				hugoUrl = portMatch[1];
			}

			const envMatch = text.match(/listening on (\S+)/i);
			if (envMatch) {
				hugoUrl = envMatch[1];
			}

			if (hugoUrl) {
				clearTimeout(timeout);
				resolve(getHugoStatus());
			}
		});

		hugoProcess!.stderr?.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
			if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
				hugoError = text.trim();
			}
		});

		hugoProcess!.on('error', (err) => {
			clearTimeout(timeout);
			hugoError = err.message;
			hugoProcess = null;
			resolve(getHugoStatus());
		});

		hugoProcess!.on('exit', (code) => {
			clearTimeout(timeout);
			if (code !== 0 && !hugoUrl) {
				hugoError = hugoError || `Hugo s'est arrêté (code ${code}).`;
			}
			hugoProcess = null;
		});
	});
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
			}, 5000);

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
