import { json } from '@sveltejs/kit';
import { cmsConfig } from '$lib/server/config';
import { listConfigTree } from '$lib/server/config-files';

export async function GET({ url }) {
	const tree = url.searchParams.get('tree') === 'true';
	if (tree) {
		return json(await listConfigTree());
	}
	return json({
		hugoSitePath: cmsConfig.hugoSitePath,
		hugoServerPort: cmsConfig.hugoServerPort,
		hugoBindAddress: cmsConfig.hugoBindAddress,
		hugoStartupTimeout: cmsConfig.hugoStartupTimeout,
		hugoStopTimeout: cmsConfig.hugoStopTimeout,
		externalPollInterval: cmsConfig.externalPollInterval,
		autoSaveDelay: cmsConfig.autoSaveDelay,
		fmSaveDelay: cmsConfig.fmSaveDelay,
		appTitle: cmsConfig.appTitle,
		defaultAuthor: cmsConfig.defaultAuthor,
		defaultArchetype: cmsConfig.defaultArchetype,
		dateFormat: cmsConfig.dateFormat,
		trashDir: cmsConfig.trashDir,
		gitEnabled: cmsConfig.git.enabled,
		defaultRemote: cmsConfig.git.remote,
		defaultBranch: cmsConfig.git.branch,
	});
}
