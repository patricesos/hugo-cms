import { json } from '@sveltejs/kit';
import { getStatus } from '$lib/server/git';

export const GET = async () => {
	try {
		const status = await getStatus();
		return json(status);
	} catch (e) {
		return json({ error: `Erreur git status : ${e}` }, { status: 500 });
	}
};
