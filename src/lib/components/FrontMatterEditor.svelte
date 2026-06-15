<script lang="ts">
	import { X, Plus, AlertTriangle } from '@lucide/svelte';

	interface FrontMatter {
		title?: string;
		date?: string;
		draft?: boolean;
		tags?: string[];
		categories?: string[];
		description?: string;
		slug?: string;
		[key: string]: unknown;
	}

	let { frontmatter = {}, onChange }: {
		frontmatter?: FrontMatter;
		onChange?: (fm: FrontMatter) => void;
	} = $props();

	let local = $state<FrontMatter>({});

	$effect(() => {
		local = { ...frontmatter };
	});

	function update(key: string, value: unknown) {
		local = { ...local, [key]: value };
		onChange?.(local);
	}

	function addTag() {
		const tags = (local.tags || []).concat(['']);
		update('tags', tags);
	}

	function updateTag(i: number, value: string) {
		const tags = [...(local.tags || [])];
		tags[i] = value;
		update('tags', tags.filter(Boolean));
	}

	function removeTag(i: number) {
		const tags = [...(local.tags || [])];
		tags.splice(i, 1);
		update('tags', tags);
	}
</script>

<div class="fm-panel">
	<div class="fm-header">
		<h3 class="fm-title">Front Matter</h3>
		{#if local.draft}
			<span class="draft-badge"><AlertTriangle size={11} />Brouillon</span>
		{/if}
	</div>

	<div class="field">
		<label for="fm-title">Titre</label>
		<input id="fm-title" type="text" value={local.title || ''} oninput={(e) => update('title', (e.target as HTMLInputElement).value)} placeholder="Titre de la page" />
	</div>

	<div class="field">
		<label for="fm-date">Date</label>
		<input id="fm-date" type="date" value={local.date?.toString().split('T')[0] || ''} oninput={(e) => update('date', (e.target as HTMLInputElement).value)} />
	</div>

	<div class="field checkbox-field">
		<label>
			<input type="checkbox" checked={local.draft ?? true} onchange={(e) => update('draft', (e.target as HTMLInputElement).checked)} />
			Brouillon (draft)
		</label>
	</div>

	<div class="field">
		<label for="fm-desc">Description</label>
		<textarea id="fm-desc" value={local.description || ''} oninput={(e) => update('description', (e.target as HTMLTextAreaElement).value)} maxlength={160} placeholder="Résumé pour les moteurs de recherche…"></textarea>
		<span class="counter">{(local.description || '').length}/160</span>
	</div>

	<div class="field">
		<span class="field-label">Tags</span>
		{#each local.tags || [] as tag, i}
			<div class="tag-row">
				<input type="text" value={tag} oninput={(e) => updateTag(i, (e.target as HTMLInputElement).value)} placeholder="tag" />
				<button class="tag-remove" onclick={() => removeTag(i)}><X size={14} /></button>
			</div>
		{/each}
		<button class="add-btn" onclick={addTag}>
			<Plus size={13} /> Ajouter un tag
		</button>
	</div>

	<div class="field">
		<label for="fm-cats">Catégories</label>
		<input id="fm-cats" type="text" value={(local.categories || []).join(', ')} oninput={(e) => update('categories', (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="cat1, cat2, cat3" />
	</div>
</div>

<style>
	.fm-panel {
		padding: 16px;
		font-size: 13px;
	}

	.fm-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.fm-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--c-text);
	}

	.draft-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 3px;
		background: #fef3c7;
		color: #92400e;
		text-transform: uppercase;
	}

	.field {
		margin-bottom: 14px;
	}

	.field > label,
	.field-label {
		display: block;
		font-weight: 500;
		color: var(--c-text-muted);
		margin-bottom: 4px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.checkbox-field label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		text-transform: none;
		letter-spacing: normal;
		color: var(--c-text);
		cursor: pointer;
	}

	.field input[type="text"],
	.field input[type="date"],
	.field textarea {
		width: 100%;
		padding: 6px 8px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		font-size: 13px;
		color: var(--c-text);
		background: var(--c-bg);
		font-family: inherit;
		transition: border-color 0.15s;
	}

	.field input:focus,
	.field textarea:focus {
		outline: none;
		border-color: var(--c-primary);
		box-shadow: 0 0 0 2px rgba(99,102,241,0.1);
	}

	.field textarea {
		resize: vertical;
		min-height: 60px;
	}

	.counter {
		display: block;
		text-align: right;
		font-size: 11px;
		color: var(--c-text-muted);
		margin-top: 2px;
	}

	.tag-row {
		display: flex;
		gap: 4px;
		margin-bottom: 4px;
	}

	.tag-row input {
		flex: 1;
	}

	.tag-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		padding: 0;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		color: var(--c-danger);
		transition: all 0.12s;
	}

	.tag-remove:hover {
		background: #fef2f2;
	}

	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border: 1px dashed var(--c-border);
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		font-size: 12px;
		color: var(--c-primary);
		transition: all 0.12s;
		font-family: inherit;
	}

	.add-btn:hover {
		background: var(--c-primary-bg);
		border-color: var(--c-primary);
	}
</style>
