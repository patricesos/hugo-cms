import { json } from '@sveltejs/kit';
import { getCmsConfig } from '$lib/server/config';
import { listConfigTree } from '$lib/server/config-files';

export async function GET({ url }) {
	const tree = url.searchParams.get('tree') === 'true';
	if (tree) {
		return json(await listConfigTree());
	}
	return json({
		hugoSitePath: getCmsConfig().hugoSitePath,
		hugoServerPort: getCmsConfig().hugoServerPort,
		hugoBindAddress: getCmsConfig().hugoBindAddress,
		hugoStartupTimeout: getCmsConfig().hugoStartupTimeout,
		hugoStopTimeout: getCmsConfig().hugoStopTimeout,
		externalPollInterval: getCmsConfig().externalPollInterval,
		autoSaveDelay: getCmsConfig().autoSaveDelay,
		fmSaveDelay: getCmsConfig().fmSaveDelay,
		appTitle: getCmsConfig().appTitle,
		defaultAuthor: getCmsConfig().defaultAuthor,
		defaultArchetype: getCmsConfig().defaultArchetype,
		dateFormat: getCmsConfig().dateFormat,
		trashDir: getCmsConfig().trashDir,
		gitEnabled: getCmsConfig().git.enabled,
		defaultRemote: getCmsConfig().git.remote,
		defaultBranch: getCmsConfig().git.branch,
	});
}
