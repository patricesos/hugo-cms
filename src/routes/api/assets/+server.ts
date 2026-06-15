import { json } from '@sveltejs/kit';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
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
	const filename = `${Date.now()}_${file.name}`;
	const filepath = join(cmsConfig.hugoStaticPath, 'images', filename);

	await writeFile(filepath, buffer);
	return json({ path: `/images/${filename}` }, { status: 201 });
}
