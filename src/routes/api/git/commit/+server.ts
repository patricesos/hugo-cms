import { json } from '@sveltejs/kit';
import { commit } from '$lib/server/git';

export const POST = async ({ request }) => {
	const { message } = await request.json();
	if (!message?.trim()) {
		return json({ error: 'Message de commit requis' }, { status: 400 });
	}
	const result = await commit(message.trim());
	return json(result);
};
