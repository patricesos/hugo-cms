import { json } from '@sveltejs/kit';
import { getAllShortcodes } from '$lib/server/shortcodes';

export async function GET() {
	const shortcodes = await getAllShortcodes();
	return json(shortcodes);
}
