import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

function loadDotenv(): void {
	const envPath = resolve(process.cwd(), '.env');
	if (!existsSync(envPath)) return;
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

function env(name: string, fallback: string): string {
	let v = process.env[name];
	if (v === undefined || v === '') return fallback;
	v = v.trim();
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
		v = v.slice(1, -1);
	}
	return v;
}

function envInt(name: string, fallback: number): number {
	const v = process.env[name];
	if (v === undefined || v === '') return fallback;
	const n = parseInt(v, 10);
	return isNaN(n) ? fallback : n;
}

function envBool(name: string, fallback: boolean): boolean {
	const v = process.env[name];
	if (v === undefined || v === '') return fallback;
	return v === '1' || v === 'true' || v === 'yes';
}

export interface CmsConfig {
	hugoSitePath: string;
	hugoContentPath: string;
	hugoStaticPath: string;
	hugoServerPort: number;
	hugoBindAddress: string;
	defaultAuthor: string;
	dateFormat: string;
	git: { enabled: boolean; remote: string; branch: string };
	trashDir: string;
	archetypesDir: string;
	configDir: string;
	shortcodesDir: string;
	imagesDir: string;
	hugoStartupTimeout: number;
	hugoStopTimeout: number;
	externalPollInterval: number;
	autoSaveDelay: number;
	fmSaveDelay: number;
	appTitle: string;
	defaultArchetype: string;
}

function loadConfig(): CmsConfig {
	loadDotenv();
	const sitePath = env('HUGO_SITE_PATH', '');
	console.log(`[config] HUGO_SITE_PATH = "${sitePath}"`);
	console.log(`[config] existsSync = ${existsSync(sitePath)}`);
	if (!sitePath || !existsSync(sitePath)) {
		throw new Error(
			`HUGO_SITE_PATH "${sitePath}" is not set or does not exist.\n`
			+ 'Set HUGO_SITE_PATH in .env to point to your Hugo site root.'
		);
	}
	const contentDir = resolve(sitePath, 'content');
	const staticPath = resolve(sitePath, 'static');
	const config: CmsConfig = {
		hugoSitePath: sitePath,
		hugoContentPath: env('HUGO_CONTENT_PATH', contentDir),
		hugoStaticPath: env('HUGO_STATIC_PATH', staticPath),
		hugoServerPort: envInt('HUGO_SERVER_PORT', 1313),
		hugoBindAddress: env('HUGO_BIND_ADDRESS', '127.0.0.1'),
		defaultAuthor: env('DEFAULT_AUTHOR', 'patricesos'),
		dateFormat: env('DATE_FORMAT', 'YYYY-MM-DD'),
		git: {
			enabled: envBool('GIT_ENABLED', false),
			remote: env('GIT_REMOTE', 'origin'),
			branch: env('GIT_BRANCH', 'main'),
		},
		trashDir: env('TRASH_DIR', '_trash'),
		archetypesDir: env('ARCHETYPES_DIR', 'archetypes'),
		configDir: env('CONFIG_DIR', 'config'),
		shortcodesDir: env('SHORTCODES_DIR', 'layouts/shortcodes'),
		imagesDir: env('IMAGES_DIR', 'images'),
		hugoStartupTimeout: envInt('HUGO_STARTUP_TIMEOUT', 15000),
		hugoStopTimeout: envInt('HUGO_STOP_TIMEOUT', 5000),
		externalPollInterval: envInt('EXTERNAL_POLL_INTERVAL', 5000),
		autoSaveDelay: envInt('AUTO_SAVE_DELAY', 2000),
		fmSaveDelay: envInt('FM_SAVE_DELAY', 2000),
		appTitle: env('APP_TITLE', 'Hugo CMS'),
		defaultArchetype: env('DEFAULT_ARCHETYPE', 'default'),
	};

	return config;
}

export const cmsConfig = loadConfig();
