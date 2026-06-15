import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { env } from '$env/static/private';

export interface CmsConfig {
	hugoContentPath: string;
	hugoStaticPath: string;
	defaultAuthor: string;
	dateFormat: string;
	git: {
		enabled: boolean;
		remote: string;
		branch: string;
	};
	hugoServerPort: number;
}

function loadConfig(): CmsConfig {
	const contentDir = env.HUGO_CONTENT_PATH || resolve(process.cwd(), 'demo-content');
	const config: CmsConfig = {
		hugoContentPath: contentDir,
		hugoStaticPath: env.HUGO_STATIC_PATH || resolve(contentDir, '..', 'static'),
		defaultAuthor: 'patricesos',
		dateFormat: 'YYYY-MM-DD',
		git: {
			enabled: false,
			remote: 'origin',
			branch: 'main',
		},
		hugoServerPort: 1313,
	};

	if (!existsSync(config.hugoContentPath)) {
		console.warn(`⚠ HUGO_CONTENT_PATH does not exist: ${config.hugoContentPath}`);
		console.warn('Using demo-content/ directory. Set HUGO_CONTENT_PATH in .env for a real Hugo repo.');
	}

	return config;
}

export const cmsConfig = loadConfig();
