import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Buffer } from 'node:buffer';
import { listAssets } from '$lib/server/content';
import { cmsConfig } from '$lib/server/config';

export async function GET() {
	const assets = await listAssets();
	return json(assets);
}

export async function POST({ request }) {
	const form = await request.formData();
	const file = form.get('file') as File;
	if (!file) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	let filename = file.name;
	const filepathBase = join(cmsConfig.hugoStaticPath, 'images', filename);
	if (existsSync(filepathBase)) {
		const parts = filename.split('.');
		const ext = parts.pop();
		const base = parts.join('.');
		let counter = 1;
		do {
			filename = `${base}_${counter}.${ext}`;
			counter++;
		} while (existsSync(join(cmsConfig.hugoStaticPath, 'images', filename)));
	}
	const filepath = join(cmsConfig.hugoStaticPath, 'images', filename);

	await mkdir(dirname(filepath), { recursive: true });
	await writeFile(filepath, buffer);
	return json({ path: `/images/${filename}` }, { status: 201 });
}
