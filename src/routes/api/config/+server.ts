import { json } from '@sveltejs/kit';
import { cmsConfig } from '$lib/server/config';

export function GET() {
	return json({
		hugoServerPort: cmsConfig.hugoServerPort,
		externalPollInterval: cmsConfig.externalPollInterval,
		autoSaveDelay: cmsConfig.autoSaveDelay,
		fmSaveDelay: cmsConfig.fmSaveDelay,
		appTitle: cmsConfig.appTitle,
		defaultArchetype: cmsConfig.defaultArchetype,
	});
}
