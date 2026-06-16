import { json } from '@sveltejs/kit';
import { getAllShortcodes } from '$lib/server/shortcodes';

export function GET() {
	const shortcodes = getAllShortcodes();
	return json(shortcodes);
}
