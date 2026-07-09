<script lang="ts">
	import BlockNoteEditor from '$lib/editor/BlockNoteEditor.svelte';

	const sampleContent = `# Exemple BlockNote

Ceci est un **paragraphe** avec du _texte formaté_.

## Liste à puces

- Premier élément
- Deuxième élément
- Troisième élément

## Bloc de code

\`\`\`python
def hello():
    print("Hello, BlockNote!")
\`\`\`

> Une citation pour tester le rendu.

---

1. Liste numérotée
2. Élément deux
3. Élément trois

[Un lien](https://example.com)

![Texte alternatif](https://picsum.photos/200/100)

Une ligne avec du ~~barré~~ et du \`code inline\`.`;

	let editorContent = $state(sampleContent);
	let currentOutput = $state('');
	let roundTripOk = $state(true);
	let activeTab = $state<'editor' | 'output'>('editor');
	let editorKey = $state(0);
	let outputLabel = $state('');

	function handleChange(md: string) {
		currentOutput = md;
	}

	function reloadEditor() {
		editorContent = currentOutput;
		editorKey++;
		activeTab = 'editor';
	}

	function testRoundTrip() {
		const original = editorContent.trim();
		const output = currentOutput.trim();
		const linesDiff = original.split('\n').length - output.split('\n').length;
		roundTripOk = original === output;
		outputLabel = roundTripOk
			? 'Round-trip parfait ✓'
			: `Différences détectées (${linesDiff} lignes)`;
	}
</script>

<svelte:head>
	<title>Sandbox BlockNote — Hugo CMS</title>
</svelte:head>

<div class="sandbox">
	<h1>🧪 Sandbox BlockNote</h1>
	<p class="subtitle">
		Test du wrapper <code>@blocknote/core</code> en Svelte.
		Chargement Markdown → édition → export Markdown.
	</p>

	<div class="tabs">
		<button
			class="tab"
			class:active={activeTab === 'editor'}
			onclick={() => { activeTab = 'editor'; }}
		>
			Éditeur
		</button>
		<button
			class="tab"
			class:active={activeTab === 'output'}
			onclick={() => { activeTab = 'output'; }}
		>
			Markdown exporté
		</button>
	</div>

	<div class="main">
		<div class="editor-pane" class:hidden={activeTab !== 'editor'}>
			<BlockNoteEditor
				content={editorContent}
				onChange={handleChange}
				editable={true}
			/>
		</div>

		<div class="output-pane" class:hidden={activeTab !== 'output'}>
			<h3>Markdown produit par BlockNote</h3>
			<pre class="markdown-output">{currentOutput || 'En attente…'}</pre>
		</div>
	</div>

	<div class="controls">
		<span class="roundtrip-badge" class:ok={roundTripOk} class:nok={!roundTripOk}>
			{outputLabel || '——'}
		</span>
		<button onclick={testRoundTrip} disabled={!currentOutput}>
			Tester round-trip
		</button>
		<button onclick={reloadEditor} disabled={!currentOutput}>
			Recharger l'éditeur avec l'output
		</button>
	</div>
</div>

<style>
	.sandbox {
		max-width: 800px;
		margin: 2rem auto;
		padding: 0 1rem;
		font-family: var(--font-ui, system-ui, sans-serif);
	}

	h1 {
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: var(--c-text-secondary, #666);
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}

	.tabs {
		display: flex;
		gap: 0;
		border-bottom: 2px solid var(--c-border, #ddd);
		margin-bottom: 1rem;
	}

	.tab {
		padding: 0.5rem 1rem;
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--c-text-secondary, #666);
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		transition: all 0.15s;
	}

	.tab:hover {
		color: var(--c-text, #000);
	}

	.tab.active {
		color: var(--c-primary, #2563eb);
		border-bottom-color: var(--c-primary, #2563eb);
	}

	.editor-pane,
	.output-pane {
		transition: opacity 0.2s;
	}

	.editor-pane.hidden,
	.output-pane.hidden {
		display: none;
	}

	.output-pane h3 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--c-text-secondary, #666);
		margin-bottom: 0.5rem;
	}

	.markdown-output {
		background: var(--c-bg-alt, #f5f5f5);
		border: 1px solid var(--c-border, #ddd);
		border-radius: 6px;
		padding: 1rem;
		font-family: var(--font-mono, 'JetBrains Mono', monospace);
		font-size: 0.85rem;
		line-height: 1.5;
		white-space: pre-wrap;
		overflow-x: auto;
		min-height: 200px;
	}

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

	.roundtrip-badge.nok {
		background: #fee2e2;
		color: #991b1b;
	}
</style>
