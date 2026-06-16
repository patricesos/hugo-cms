import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { Buffer } from 'node:buffer';
import { listAssets, listAssetTree, safeResolveIn } from '$lib/server/content';
import { cmsConfig } from '$lib/server/config';

export async function GET({ url }) {
	if (url.searchParams.has('tree')) {
		const tree = await listAssetTree();
		return json(tree);
	}
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
	let filename = basename(file.name).replace(/\0/g, '');
	const imagesDir = safeResolveIn(cmsConfig.hugoStaticPath, cmsConfig.imagesDir);
	if (existsSync(join(imagesDir, filename))) {
		const parts = filename.split('.');
		const ext = parts.pop();
		const baseName = parts.join('.');
		let counter = 1;
		do {
			filename = `${baseName}_${counter}.${ext}`;
			counter++;
		} while (existsSync(join(imagesDir, filename)));
	}
	const filepath = safeResolveIn(cmsConfig.hugoStaticPath, cmsConfig.imagesDir, filename);

	await mkdir(dirname(filepath), { recursive: true });
	await writeFile(filepath, buffer);
	return json({ path: `/images/${filename}` }, { status: 201 });
}
