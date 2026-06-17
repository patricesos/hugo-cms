import { readFileSync, existsSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';

function resolveDotenv() {
	const cwdExample = resolve(process.cwd(), '.env.example');
	if (existsSync(cwdExample)) {
		const cwdDotenv = resolve(process.cwd(), '.env');
		if (!existsSync(cwdDotenv)) {
			copyFileSync(cwdExample, cwdDotenv);
			console.log('[start] Created .env from .env.example');
		}
		return cwdDotenv;
	}
	let dir = process.cwd();
	for (let i = 0; i < 20; i++) {
		const candidate = resolve(dir, '.env');
		if (existsSync(candidate)) return candidate;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
	return null;
}

function loadDotenv() {
	const envPath = resolveDotenv();
	if (!envPath) return;
	const content = readFileSync(envPath, 'utf-8');
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let val = trimmed.slice(eq + 1).trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		if (key && !process.env[key]) {
			process.env[key] = val;
		}
	}
}

function detectPort() {
	const cfgPath = resolve(homedir(), '.config', 'hugocms', 'config.toml');
	if (existsSync(cfgPath)) {
		try {
			const raw = readFileSync(cfgPath, 'utf-8');
			const m = raw.match(/^cmsPort\s*=\s*(\d[_\d]*\d|\d)\s*$/m);
			if (m) {
				const n = parseInt(m[1].replace(/_/g, ''), 10);
				if (n >= 1 && n <= 65535) return n;
			}
		} catch {
			// ignore
		}
	}
	return null;
}

loadDotenv();

const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
const tomlPort = detectPort();
const port = tomlPort ?? envPort ?? 1703;
process.env.PORT = String(port);

console.log(`[start] CMS port: ${port} (TOML: ${tomlPort ?? '—'}, env: ${envPort ?? '—'})`);

await import('./build/index.js');
