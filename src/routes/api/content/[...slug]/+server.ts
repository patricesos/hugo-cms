import { error, json } from '@sveltejs/kit';
import { readContent, createContent, updateContent, deleteContent, renameContent } from '$lib/server/content';
import { listArchetypes, renderArchetype } from '$lib/server/archetypes';
import { writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { getCmsConfig } from '$lib/server/config';
import { parseFrontmatter } from '$lib/server/markdown';

function safeResolveBase(...segments: string[]): string {
	const base = getCmsConfig().hugoContentPath;
	const resolved = resolve(base, ...segments);
	if (!resolved.startsWith(resolve(base))) {
		throw new Error('Path traversal detected');
	}
	return resolved;
}

export async function GET({ params }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	try {
		const item = await readContent(slug);
		return json(item);
	} catch (e) {
		error(404, (e as Error).message);
	}
}

export async function POST({ params, request }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	const { body, frontmatter, archetype, frontmatterLanguage } = await request.json();

	try {
		if (archetype) {
			const archetypes = await listArchetypes();
			const match = archetypes.find(a => a.name === archetype);
			if (match) {
				const rendered = renderArchetype(match.source, (frontmatter?.title as string) || slug, slug);
				const filePath = safeResolveBase(slug + '.md');
				const dir = dirname(filePath);
				if (!existsSync(dir)) {
					await mkdir(dir, { recursive: true });
				}
				await writeFile(filePath, rendered, 'utf-8');
				const stats = await stat(filePath);
				const parsed = parseFrontmatter(rendered);
				return json({
					frontmatter: parsed.frontmatter,
					body: parsed.body,
					slug,
					mtimeMs: stats.mtimeMs,
					frontmatterLanguage: parsed.language,
				}, { status: 201 });
			}
		}

		const item = await createContent(slug, body || '', frontmatter, frontmatterLanguage || 'yaml');
		return json(item, { status: 201 });
	} catch (e) {
		error(409, (e as Error).message);
	}
}

export async function PUT({ params, request }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	const { body, frontmatter, expectedMtimeMs, frontmatterLanguage } = await request.json();
	try {
		const item = await updateContent(slug, body, frontmatter, expectedMtimeMs, frontmatterLanguage);
		return json(item);
	} catch (e) {
		const err = e as Error & { statusCode?: number; serverMtimeMs?: number };
		if (err.statusCode === 409) {
			return json({ error: 'conflict', slug, serverMtimeMs: err.serverMtimeMs }, { status: 409 });
		}
		error(404, (e as Error).message);
	}
}

export async function DELETE({ params }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	try {
		await deleteContent(slug);
		return new Response(null, { status: 204 });
	} catch (e) {
		error(404, (e as Error).message);
	}
}

export async function PATCH({ params, request }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	const { newSlug } = await request.json();
	if (!newSlug) error(400, 'newSlug is required');
	if (newSlug.includes('..')) error(400, 'Path traversal detected in newSlug');
	try {
		const item = await renameContent(slug, newSlug);
		return json(item);
	} catch (e) {
		error(409, (e as Error).message);
	}
}
