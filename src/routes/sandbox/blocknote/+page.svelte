<script lang="ts">
	import BlockNoteEditor from '$lib/editor/BlockNoteEditor.svelte';
	import { splitRawContent, serializeFm } from '$lib/editor/mode-sync.svelte.ts';

	// Article complet avec frontmatter (entrée)
	const sampleRawContent = `---
title: Découverte de BlockNote
date: 2026-06-19
draft: false
description: "Premiers tests d'intégration d'un éditeur block-based dans Hugo CMS"
tags:
  - hugo
  - blocknote
  - wysiwyg
categories:
  - Dev
---

# Introduction

BlockNote est un éditeur **block-based** construit sur **TipTap/ProseMirror**.

## Avantages

- Séparation claire contenu / structure
- Export Markdown fidèle
- Extensible par schémas

## À tester

- [x] Slash menu
- [x] Round-trip
- [ ] Frontmatter
- [ ] Intégration Hugo

> Écrire en blocks, penser en composants.`;

	// -- État partagé --
	let rawInput = $state(sampleRawContent);
	let fm = $state<Record<string, unknown>>({});
	let fmFormat = $state<'yaml' | 'toml'>('yaml');
	let body = $state('');
	let outputMarkdown = $state('');
	let outputLabel = $state('');

	// -- Initialisation --
	function parseRaw() {
		const result = splitRawContent(rawInput);
		fm = result.frontmatter ?? {};
		fmFormat = result.format;
		body = result.body;
	}

	parseRaw();

	// -- Champs structurés du frontmatter --
	let fmTitle = $derived((fm.title as string) ?? '');
	let fmDate = $derived((fm.date as string) ?? '');
	let fmDraft = $derived(fm.draft === true);
	let fmDescription = $derived((fm.description as string) ?? '');
	let fmTags = $derived<string[]>((fm.tags as string[]) ?? []);
	let fmCategories = $derived<string[]>((fm.categories as string[]) ?? []);

	function updateFmField(key: string, value: unknown) {
		fm = { ...fm, [key]: value };
	}

	function rebuildRaw() {
		const fmString = Object.keys(fm).length > 0
			? serializeFm(fm, fmFormat)
			: '';
		rawInput = fmString + '\n' + body;
	}

	function handleBodyChange(md: string) {
		outputMarkdown = md;
		const fmString = Object.keys(fm).length > 0
			? serializeFm(fm, fmFormat)
			: '';
		rawInput = fmString + '\n' + md;
	}

	function testRoundTrip() {
		const original = body.trim();
		const output = outputMarkdown.trim();
		const ok = original === output;
		const diff = ok ? 0 : original.split('\n').length - output.split('\n').length;
		outputLabel = ok
			? 'Round-trip body parfait ✓'
			: `Body : ${Math.abs(diff)} lignes de différence`;
	}
</script>

<svelte:head>
	<title>Sandbox BlockNote + Frontmatter — Hugo CMS</title>
</svelte:head>

<div class="sandbox">
	<h1>🧪 BlockNote + Frontmatter</h1>
	<p class="subtitle">
		Frontmatter extrait par <code>splitRawContent()</code> → édition séparée →
		recomposé par <code>serializeFm()</code>. BlockNote ne voit que le <em>body</em>.
	</p>

	<!-- Source brute (lecture seule, pour diagnostic) -->
	<details class="raw-debug">
		<summary>Markdown brut complet ({rawInput.split('\n').length} lignes)</summary>
		<pre class="raw-preview">{rawInput}</pre>
	</details>

	<!-- Panneau d'édition : Frontmatter (gauche) + Body BlockNote (droite) -->
	<div class="split">
		<section class="fm-panel">
			<h2>Frontmatter</h2>
			<div class="fm-fields">
				<label>
					<span>Titre</span>
					<input
						type="text"
						value={fmTitle}
						oninput={(e) => updateFmField('title', (e.target as HTMLInputElement).value)}
					/>
				</label>
				<label>
					<span>Date</span>
					<input
						type="date"
						value={fmDate}
						oninput={(e) => updateFmField('date', (e.target as HTMLInputElement).value)}
					/>
				</label>
				<label class="checkbox-row">
					<input
						type="checkbox"
						checked={fmDraft}
						onchange={(e) => updateFmField('draft', (e.target as HTMLInputElement).checked)}
					/>
					<span>Brouillon</span>
				</label>
				<label>
					<span>Description</span>
					<textarea
						rows="2"
						value={fmDescription}
						oninput={(e) => updateFmField('description', (e.target as HTMLInputElement).value)}
					></textarea>
				</label>
				<label>
					<span>Tags (séparés par virgule)</span>
					<input
						type="text"
						value={fmTags.join(', ')}
						oninput={(e) => {
							const vals = (e.target as HTMLInputElement).value
								.split(',')
								.map((s) => s.trim())
								.filter(Boolean);
							updateFmField('tags', vals);
						}}
					/>
				</label>
				<label>
					<span>Catégories (séparées par virgule)</span>
					<input
						type="text"
						value={fmCategories.join(', ')}
						oninput={(e) => {
							const vals = (e.target as HTMLInputElement).value
								.split(',')
								.map((s) => s.trim())
								.filter(Boolean);
							updateFmField('categories', vals);
						}}
					/>
				</label>
			</div>
		</section>

		<section class="body-panel">
			<h2>Body (BlockNote)</h2>
			<BlockNoteEditor
				content={body}
				{...{onChange: handleBodyChange}}
				editable={true}
			/>
		</section>
	</div>

	<!-- Output combiné -->
	<div class="controls">
		<span class="roundtrip-badge" class:ok={outputLabel.includes('✓')}>
			{outputLabel || '——'}
		</span>
		<button onclick={testRoundTrip} disabled={!outputMarkdown}>
			Tester round-trip (body)
		</button>
	</div>

	<details class="output-debug">
		<summary>Markdown reconstitué (frontmatter + body)</summary>
		<pre class="raw-preview">{rawInput}</pre>
	</details>
</div>

<style>
	.sandbox {
		max-width: 1200px;
		margin: 2rem auto;
		padding: 0 1rem;
		font-family: var(--font-ui, system-ui, sans-serif);
	}

	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.subtitle {
		color: var(--c-text-secondary, #666);
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}
	h2 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
	}

	/* Split pane */
	.split {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: 1.5rem;
		align-items: start;
	}

	.fm-panel {
		background: var(--c-bg-alt, #f9f9f9);
		border: 1px solid var(--c-border, #ddd);
		border-radius: 8px;
		padding: 1rem;
	}

	.fm-fields {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.fm-fields label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--c-text-secondary, #555);
	}

	.fm-fields input[type="text"],
	.fm-fields input[type="date"],
	.fm-fields textarea {
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--c-border, #ccc);
		border-radius: 4px;
		font-family: inherit;
		font-size: 0.85rem;
	}

	.fm-fields textarea {
		resize: vertical;
	}

	.checkbox-row {
		flex-direction: row !important;
		align-items: center;
		gap: 0.5rem !important;
	}

	.body-panel {
		min-width: 0;
	}

	/* Raw preview */
	.raw-debug, .output-debug {
		margin: 1rem 0;
	}

	.raw-preview {
		background: var(--c-bg-alt, #f5f5f5);
		border: 1px solid var(--c-border, #ddd);
		border-radius: 6px;
		padding: 1rem;
		font-family: var(--font-mono, 'JetBrains Mono', monospace);
		font-size: 0.8rem;
		line-height: 1.4;
		white-space: pre-wrap;
		overflow-x: auto;
		max-height: 300px;
		overflow-y: auto;
	}

	/* Controls */
	.controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	.controls button {
		padding: 0.4rem 0.8rem;
		font-size: 0.85rem;
		border: 1px solid var(--c-border, #ddd);
		border-radius: 4px;
		background: var(--c-bg, #fff);
		cursor: pointer;
		transition: background 0.15s;
	}

	.controls button:hover:not(:disabled) {
		background: var(--c-bg-hover, #f0f0f0);
	}

	.controls button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.roundtrip-badge {
		font-size: 0.8rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-weight: 500;
	}

	.roundtrip-badge.ok {
		background: #d1fae5;
		color: #065f46;
	}
</style>
