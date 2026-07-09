import { json } from '@sveltejs/kit';
import { APP_VERSION, getNodeVersion, getHugoVersion, getHugoVersionFull } from '$lib/server/version';

export async function GET() {
	const [nodeVersion, hugoVersion, hugoVersionFull] = await Promise.all([
		getNodeVersion(),
		getHugoVersion(),
		getHugoVersionFull(),
	]);

	return json({
		appVersion: APP_VERSION,
		nodeVersion,
		hugoVersion,
		hugoVersionFull,
	});
}
