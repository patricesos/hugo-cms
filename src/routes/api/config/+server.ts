import { json } from '@sveltejs/kit';
import { getCmsConfig } from '$lib/server/config';
import { listConfigTree } from '$lib/server/config-files';

export async function GET({ url }) {
	const tree = url.searchParams.get('tree') === 'true';
	if (tree) {
		return json(await listConfigTree());
	}
	const cfg = getCmsConfig();
	return json({
		hugoSitePath: cfg.hugoSitePath,
		hugoServerPort: cfg.hugoServerPort,
		hugoBindAddress: cfg.hugoBindAddress,
		hugoStartupTimeout: cfg.hugoStartupTimeout,
		hugoStopTimeout: cfg.hugoStopTimeout,
		externalPollInterval: cfg.externalPollInterval,
		autoSaveDelay: cfg.autoSaveDelay,
		fmSaveDelay: cfg.fmSaveDelay,
		appTitle: cfg.appTitle,
		defaultAuthor: cfg.defaultAuthor,
		defaultArchetype: cfg.defaultArchetype,
		dateFormat: cfg.dateFormat,
		trashDir: cfg.trashDir,
		gitEnabled: cfg.git.enabled,
		defaultRemote: cfg.git.remote,
		defaultBranch: cfg.git.branch,
		siteValid: cfg.siteValid,
	});
}
