import { json } from '@sveltejs/kit';
import { cmsConfig } from '$lib/server/config';
import { listConfigTree } from '$lib/server/config-files';

export async function GET({ url }) {
	const tree = url.searchParams.get('tree') === 'true';
	if (tree) {
		return json(await listConfigTree());
	}
	return json({
		hugoServerPort: cmsConfig.hugoServerPort,
		externalPollInterval: cmsConfig.externalPollInterval,
		autoSaveDelay: cmsConfig.autoSaveDelay,
		fmSaveDelay: cmsConfig.fmSaveDelay,
		appTitle: cmsConfig.appTitle,
		defaultArchetype: cmsConfig.defaultArchetype,
		trashDir: cmsConfig.trashDir,
	});
}
