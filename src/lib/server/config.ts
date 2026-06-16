import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

function env(name: string, fallback: string): string {
	return process.env[name] || fallback;
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
	const contentDir = env('HUGO_CONTENT_PATH', resolve(process.cwd(), 'demo-content'));
	const config: CmsConfig = {
		hugoContentPath: contentDir,
		hugoStaticPath: env('HUGO_STATIC_PATH', resolve(contentDir, '..', 'static')),
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

	if (!existsSync(config.hugoContentPath)) {
		console.warn(`⚠ HUGO_CONTENT_PATH does not exist: ${config.hugoContentPath}`);
		console.warn('Using demo-content/ directory. Set HUGO_CONTENT_PATH in .env for a real Hugo repo.');
	}

	return config;
}

export const cmsConfig = loadConfig();
