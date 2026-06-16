import { json } from '@sveltejs/kit';
import { getLogs, clearLogs } from '$lib/server/hugo';

export async function GET() {
	return json(getLogs());
}

export async function DELETE() {
	clearLogs();
	return new Response(null, { status: 204 });
}
