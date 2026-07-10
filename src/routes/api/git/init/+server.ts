import { json } from '@sveltejs/kit';
import { ensureRepo } from '$lib/server/git';

export const POST = async () => {
	try {
		const result = await ensureRepo();
		return json(result);
	} catch (e) {
		return json({ initialized: false, message: `Erreur git : ${e}` }, { status: 500 });
	}
};
