import { resolve, dirname, isAbsolute } from 'node:path';
import { readFileSync, existsSync, copyFileSync } from 'node:fs';
import { loadUserSettings, type UserSettings } from './user-config';

/** Find or create .env relative to runtime CWD first, then walk up parents. */
function resolveDotenv(): string | null {
	// 1. If .env.example exists in CWD, always create .env there (runtime-local)
	const cwdExample = resolve(process.cwd(), '.env.example');
	if (existsSync(cwdExample)) {
		const cwdDotenv = resolve(process.cwd(), '.env');
		if (!existsSync(cwdDotenv)) {
			copyFileSync(cwdExample, cwdDotenv);
			console.log(`[config] Created ${cwdDotenv} from .env.example`);
		}
		return cwdDotenv;
	}
	// 2. Walk up parents to find an existing .env (dev mode)
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

function loadDotenv(): void {
	const envPath = resolveDotenv();
	if (!envPath) return;
	const envDir = dirname(envPath);
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
	if (process.env['HUGO_SITE_PATH'] && !isAbsolute(process.env['HUGO_SITE_PATH'])) {
		process.env['HUGO_SITE_PATH'] = resolve(envDir, process.env['HUGO_SITE_PATH']);
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
	cmsPort: number;
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

function looksLikeHugoRoot(dir: string): boolean {
	if (!existsSync(dir)) return false;
	const rootConfigs = ['config.toml', 'config.yaml', 'config.yml', 'hugo.toml', 'hugo.yaml', 'hugo.yml'];
	for (const name of rootConfigs) {
		if (existsSync(resolve(dir, name))) return true;
	}
	if (existsSync(resolve(dir, 'config'))) return true;
	return false;
}

function loadConfig(): CmsConfig {
	loadDotenv();
	const envSitePath = env('HUGO_SITE_PATH', '');
	console.log(`[config] HUGO_SITE_PATH = "${envSitePath}"`);
	const userSettings = loadUserSettings();
	const sitePath = (!userSettings.hugoSitePathUseDotEnv && userSettings.hugoSitePathCustom)
		? userSettings.hugoSitePathCustom
		: envSitePath;
	console.log(`[config] Using site path: "${sitePath}"`);
	if (!sitePath || !looksLikeHugoRoot(sitePath)) {
		throw new Error(
			`HUGO_SITE_PATH "${sitePath}" is not a Hugo site root.\n`
			+ 'Set HUGO_SITE_PATH in .env or provide a valid custom path in Settings.'
		);
	}
	return buildConfig(sitePath, userSettings);
}

function buildConfig(sitePath: string, userSettings: UserSettings): CmsConfig {
	const contentDir = resolve(sitePath, 'content');
	const staticPath = resolve(sitePath, 'static');
	const cmsPort = envInt('PORT', userSettings.cmsPort);
	return {
		hugoSitePath: sitePath,
		hugoContentPath: env('HUGO_CONTENT_PATH', contentDir),
		hugoStaticPath: env('HUGO_STATIC_PATH', staticPath),
		cmsPort,
		hugoServerPort: envInt('HUGO_SERVER_PORT', userSettings.hugoPort),
		hugoBindAddress: env('HUGO_BIND_ADDRESS', userSettings.hugoBindAddress),
		defaultAuthor: env('DEFAULT_AUTHOR', 'patricesos'),
		dateFormat: env('DATE_FORMAT', 'YYYY-MM-DD'),
		git: {
			enabled: envBool('GIT_ENABLED', false),
			remote: env('GIT_REMOTE', 'origin'),
			branch: env('GIT_BRANCH', 'main'),
		},
		trashDir: env('TRASH_DIR', userSettings.trashDir),
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
}

let _cmsConfig: CmsConfig | null = null;

export function getCmsConfig(): CmsConfig {
	if (_cmsConfig) return _cmsConfig;
	try {
		_cmsConfig = loadConfig();
		return _cmsConfig;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.error(`[config] ${msg}`);
		throw new Error(msg.split('\n')[0]);
	}
}

/** Pour les tests uniquement : permet d'injecter une config sans passer par loadConfig(). */
export function __setCmsConfigForTests(config: CmsConfig | null): void {
	_cmsConfig = config;
}
