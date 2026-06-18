import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { __setCmsConfigForTests } from './config';
import { __resetHugoStateForTests, MAX_LOG_ENTRIES } from './hugo';
import type { Mock } from 'vitest';

interface MockProcess {
	stdout: EventEmitter;
	stderr: EventEmitter;
	on: ReturnType<typeof vi.fn>;
	kill: ReturnType<typeof vi.fn>;
	emit: (event: string, ...args: unknown[]) => boolean;
	exitCode: number | null;
}

const { ref } = vi.hoisted(() => {
	const ref: { current: MockProcess | null } = { current: null };
	return { ref };
});

vi.mock('node:child_process', () => ({
	default: { spawn: (..._args: unknown[]) => ref.current },
	spawn: (..._args: unknown[]) => ref.current,
}));

function createMockProcess(): MockProcess {
	const stdout = new EventEmitter();
	const stderr = new EventEmitter();
	const emitter = new EventEmitter();
	const proc: MockProcess = {
		stdout, stderr,
		kill: vi.fn(),
		on: emitter.on.bind(emitter),
		emit: emitter.emit.bind(emitter),
		exitCode: null,
	};
	ref.current = proc;
	return proc;
}

beforeEach(async () => {
	createMockProcess();

	__setCmsConfigForTests({
		hugoSitePath: '/tmp/test-hugo-site',
		hugoContentPath: '/tmp/test-hugo-site/content',
		hugoStaticPath: '/tmp/test-hugo-site/static',
		cmsPort: 3000,
		hugoServerPort: 1313,
		hugoBindAddress: '127.0.0.1',
		defaultAuthor: 'test',
		dateFormat: 'YYYY-MM-DD',
		git: { enabled: false, remote: 'origin', branch: 'main' },
		trashDir: '_trash',
		archetypesDir: 'archetypes',
		configDir: 'config',
		shortcodesDir: 'layouts/shortcodes',
		imagesDir: 'images',
		hugoStartupTimeout: 200,
		hugoStopTimeout: 100,
		externalPollInterval: 5000,
		autoSaveDelay: 2000,
		fmSaveDelay: 2000,
		appTitle: 'Test',
		defaultArchetype: 'default',
	});
});

afterEach(() => {
	__resetHugoStateForTests();
	__setCmsConfigForTests(null);
	vi.clearAllMocks();
});

function emitStdout(text: string): void {
	if (!ref.current) throw new Error('no mock process');
	ref.current.stdout.emit('data', Buffer.from(text));
}

function emitStderr(text: string): void {
	if (!ref.current) throw new Error('no mock process');
	ref.current.stderr.emit('data', Buffer.from(text));
}

function emitError(err: Error): void {
	if (!ref.current) throw new Error('no mock process');
	ref.current.emit('error', err);
}

function emitExit(code: number): void {
	if (!ref.current) throw new Error('no mock process');
	ref.current.exitCode = code;
	ref.current.emit('exit', code);
}

describe('getHugoStatus', () => {
	it('returns idle status before any start', async () => {
		const { getHugoStatus } = await import('./hugo');
		const status = getHugoStatus();
		expect(status.running).toBe(false);
		expect(status.url).toBeNull();
		expect(status.port).toBe(1313);
		expect(status.error).toBeNull();
	});
});

describe('startHugoServer', () => {
	it('resolves with running status when server URL is detected', async () => {
		const { startHugoServer, getHugoStatus } = await import('./hugo');
		const promise = startHugoServer();
		emitStdout('Web Server is available at http://localhost:1313/');
		const status = await promise;
		expect(status.running).toBe(true);
		expect(status.url).toBe('http://localhost:1313/');
		expect(getHugoStatus().running).toBe(true);
	});

	it('does not spawn a second process if already running', async () => {
		const { startHugoServer } = await import('./hugo');
		const promise1 = startHugoServer();
		emitStdout('Web Server is available at http://localhost:1313/');
		await promise1;

		const promise2 = startHugoServer();
		const status = await promise2;
		expect(status.running).toBe(true);
	});

	it('sets hugoError on non-zero exit before URL is found', async () => {
		const { startHugoServer, getHugoStatus } = await import('./hugo');
		const promise = startHugoServer();
		emitExit(1);
		const status = await promise;
		expect(status.running).toBe(false);
		expect(status.error).toContain('arrêté');
	});

	it('handles spawn error event gracefully', async () => {
		const { startHugoServer, getHugoStatus } = await import('./hugo');
		const promise = startHugoServer();
		emitError(new Error('ENOENT: hugo not found'));
		const status = await promise;
		expect(status.running).toBe(false);
		expect(status.error).toBe('ENOENT: hugo not found');
	});

	it('resolves with timeout error when no output is received', async () => {
		const { startHugoServer } = await import('./hugo');
		const promise = startHugoServer();
		const status = await promise;
		expect(status.running).toBe(false);
		expect(status.error).toContain("n'a pas démarré dans les temps");
	}, 10000);
});

describe('stopHugoServer', () => {
	it('stops a running process cleanly on SIGTERM', async () => {
		const { startHugoServer, stopHugoServer, getHugoStatus } = await import('./hugo');
		const startPromise = startHugoServer();
		emitStdout('Web Server is available at http://localhost:1313/');
		await startPromise;

		const stopPromise = stopHugoServer();
		emitExit(0);
		const status = await stopPromise;
		expect(status.running).toBe(false);
		expect(status.url).toBeNull();
	});

	it('falls back to SIGKILL when process does not respond to SIGTERM', async () => {
		const { startHugoServer, stopHugoServer } = await import('./hugo');
		const startPromise = startHugoServer();
		emitStdout('Web Server is available at http://localhost:1313/');
		await startPromise;

		const status = await stopHugoServer();
		expect(ref.current?.kill).toHaveBeenCalledWith('SIGKILL');
		expect(status.running).toBe(false);
	}, 10000);

	it('returns status immediately when no process is active', async () => {
		const { stopHugoServer, getHugoStatus } = await import('./hugo');
		const status = await stopHugoServer();
		expect(status.running).toBe(false);
	});
});

describe('logs', () => {
	it('captures stdout and stderr lines in order', async () => {
		const { startHugoServer, getLogs } = await import('./hugo');
		const promise = startHugoServer();
		emitStderr('Start building sites …');
		emitStdout('Web Server is available at http://localhost:1313/');
		await promise;

		const logs = getLogs();
		expect(logs).toHaveLength(2);
		expect(logs[0].stream).toBe('stderr');
		expect(logs[0].text).toBe('Start building sites …');
		expect(logs[1].stream).toBe('stdout');
		expect(logs[1].text).toBe('Web Server is available at http://localhost:1313/');
	});

	it('clearLogs empties the buffer', async () => {
		const { startHugoServer, getLogs, clearLogs } = await import('./hugo');
		const promise = startHugoServer();
		emitStdout('Web Server is available at http://localhost:1313/');
		await promise;
		expect(getLogs().length).toBeGreaterThan(0);
		clearLogs();
		expect(getLogs()).toEqual([]);
	});

	it('truncates buffer at MAX_LOG_ENTRIES', async () => {
		const { startHugoServer, getLogs } = await import('./hugo');
		const promise = startHugoServer();

		for (let i = 0; i < MAX_LOG_ENTRIES + 50; i++) {
			emitStdout(`line ${i}`);
		}
		emitStdout('Web Server is available at http://localhost:1313/');
		await promise;

		const logs = getLogs();
		expect(logs.length).toBeLessThanOrEqual(MAX_LOG_ENTRIES);
		expect(logs[logs.length - 1].text).toBe('Web Server is available at http://localhost:1313/');
	});
});
