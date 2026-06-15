<script lang="ts">
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
	<h3 class="fm-title">Front Matter</h3>

	<div class="field">
		<label for="fm-title">Titre</label>
		<input id="fm-title" type="text" value={local.title || ''} oninput={(e) => update('title', (e.target as HTMLInputElement).value)} />
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
		<textarea id="fm-desc" value={local.description || ''} oninput={(e) => update('description', (e.target as HTMLTextAreaElement).value)} maxlength={160}></textarea>
		<span class="counter">{(local.description || '').length}/160</span>
	</div>

	<div class="field">
		<span class="field-label">Tags</span>
		{#each local.tags || [] as tag, i}
			<div class="tag-row">
				<input id="fm-tag-{i}" type="text" value={tag} oninput={(e) => updateTag(i, (e.target as HTMLInputElement).value)} />
				<button onclick={() => removeTag(i)}>×</button>
			</div>
		{/each}
		<button class="add-btn" onclick={addTag}>+ Ajouter un tag</button>
	</div>

	<div class="field">
		<label for="fm-cats">Catégories</label>
		<input id="fm-cats" type="text" value={(local.categories || []).join(', ')} oninput={(e) => update('categories', (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))} />
	</div>
</div>

<style>
	.fm-panel {
		padding: 16px;
		font-size: 13px;
	}

	.fm-title {
		font-size: 14px;
		font-weight: 600;
		margin-bottom: 16px;
		color: #374151;
	}

	.field {
		margin-bottom: 14px;
	}

	.field > label,
	.field-label {
		display: block;
		font-weight: 500;
		color: #6b7280;
		margin-bottom: 4px;
		font-size: 12px;
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
		color: #374151;
		cursor: pointer;
	}

	.field input[type="text"],
	.field input[type="date"],
	.field textarea {
		width: 100%;
		padding: 6px 8px;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 13px;
		color: #1f2937;
		background: white;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}

	.field input:focus,
	.field textarea:focus {
		outline: none;
		border-color: #6366f1;
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
		color: #9ca3af;
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

	.tag-row button {
		padding: 4px 8px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: #ef4444;
		font-size: 16px;
	}

	.add-btn {
		padding: 4px 8px;
		border: 1px dashed #d1d5db;
		border-radius: 4px;
		background: transparent;
		cursor: pointer;
		font-size: 12px;
		color: #6366f1;
		width: 100%;
	}

	.add-btn:hover {
		background: #f9fafb;
	}
</style>
