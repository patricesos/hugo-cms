import { json } from '@sveltejs/kit';
import { readdirSync, existsSync } from 'node:fs';

function getDriveRoots(): string[] {
	const drives: string[] = [];
	if (process.platform !== 'win32') return ['/'];
	for (let i = 65; i <= 90; i++) {
		const drive = `${String.fromCharCode(i)}:\\`;
		if (existsSync(drive)) drives.push(drive);
	}
	return drives;
}

export async function GET({ url }) {
	const pathParam = url.searchParams.get('path') || '';

	if (!pathParam) {
		const dirs = getDriveRoots();
		return json({ path: '', parent: null, directories: dirs });
	}

	const normalized = pathParam.replace(/\\/g, '/').replace(/\/+$/, '');
	const parent = (() => {
		const idx = normalized.lastIndexOf('/');
		if (idx <= 0) return process.platform === 'win32' ? '' : '/';
		return normalized.slice(0, idx) || (process.platform === 'win32' ? '' : '/');
	})();

	try {
		const entries = readdirSync(pathParam, { withFileTypes: true });
		const directories = entries
			.filter(e => e.isDirectory())
			.map(e => pathParam.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + e.name)
			.sort((a, b) => a.localeCompare(b));
		return json({ path: pathParam, parent, directories });
	} catch {
		return json({ path: pathParam, parent, directories: [] });
	}
}
