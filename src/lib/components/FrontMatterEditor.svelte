<script lang="ts">
	import { X, Plus, AlertTriangle, Send, FileEdit, Settings2, Code, Save } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import yaml from 'js-yaml';
	import { parse, stringify } from '@iarna/toml';

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

	let { frontmatter = {}, format = 'yaml', fmRawMode = false, onChange }: {
		frontmatter?: FrontMatter;
		format?: 'yaml' | 'toml';
		fmRawMode?: boolean;
		onChange?: (fm: FrontMatter) => void;
	} = $props();

	const BUILT_IN_KEYS = new Set(['title', 'date', 'draft', 'description', 'tags', 'categories', 'slug']);

	let local = $state<FrontMatter>({});
	let showCustomFields = $state(false);
	let rawMode = $state(false);

	$effect(() => {
		rawMode = fmRawMode;
	});
	let rawYaml = $state('');

	$effect(() => {
		local = { ...frontmatter };
	});

	let customEntries = $derived(
		Object.entries(local).filter(([k]) => !BUILT_IN_KEYS.has(k))
	);

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

	function addCustomField() {
		const base = 'custom';
		let key = base;
		let n = 1;
		while (key in local) { key = `${base}_${n++}`; }
		local = { ...local, [key]: '' };
		onChange?.(local);
		showCustomFields = true;
	}

	function updateCustomKey(oldKey: string, newKey: string) {
		if (!newKey || oldKey === newKey) return;
		if (newKey in local) {
			alert(`Une clé "${newKey}" existe déjà.`);
			return;
		}
		const val = local[oldKey];
		const { [oldKey]: _, ...rest } = local;
		local = { ...rest, [newKey]: val };
		onChange?.(local);
	}

	function removeCustomField(key: string) {
		const { [key]: _, ...rest } = local;
		local = rest;
		onChange?.(local);
	}

	type FieldType = 'string' | 'bool' | 'list' | 'color';

	function getFieldType(val: unknown): FieldType {
		if (typeof val === 'boolean') return 'bool';
		if (Array.isArray(val)) return 'list';
		if (typeof val === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(val)) return 'color';
		return 'string';
	}

	function setFieldType(key: string, from: FieldType, to: FieldType) {
		const val = local[key];
		if (to === 'bool') {
			if (from === 'string') update(key, val === 'true' || val === '1');
			else if (from === 'list') update(key, Array.isArray(val) && val.length > 0);
		} else if (to === 'list') {
			if (from === 'string') update(key, typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : []);
			else if (from === 'bool') update(key, val ? ['true'] : []);
		} else if (to === 'color') {
			if (from === 'string') update(key, typeof val === 'string' && /^#?[0-9a-fA-F]{3,8}$/.test(val) ? (val.startsWith('#') ? val : `#${val}`) : '#000000');
			else update(key, '#000000');
		} else {
			if (from === 'bool') update(key, val ? 'true' : 'false');
			else if (from === 'list') update(key, Array.isArray(val) ? val.join(', ') : '');
			else if (from === 'color') update(key, typeof val === 'string' ? val : '#000000');
		}
	}

	function updateCustomValue(key: string, val: string, type: FieldType) {
		if (type === 'bool') return;
		if (type === 'list') {
			update(key, val.split(',').map(s => s.trim()).filter(Boolean));
		} else {
			update(key, val);
		}
	}

	function formatListForDisplay(val: unknown): string {
		return Array.isArray(val) ? val.join(', ') : '';
	}

	function serializeFmForEdit(fm: FrontMatter, fmt: 'yaml' | 'toml'): string {
		if (fmt === 'toml') {
			const result = stringify(fm as Record<string, unknown>);
			return result;
		}
		return yaml.dump(fm, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }).trim();
	}

	function parseFmFromEdit(text: string, fmt: 'yaml' | 'toml'): FrontMatter | null {
		try {
			if (fmt === 'toml') {
				const parsed = parse(text) as Record<string, unknown>;
				if (parsed && typeof parsed === 'object') return parsed as FrontMatter;
			} else {
				const parsed = yaml.load(text);
				if (parsed && typeof parsed === 'object') return parsed as FrontMatter;
			}
		} catch { /* ignore */ }
		return null;
	}

	function enterRawMode() {
		rawYaml = serializeFmForEdit(local, format);
		rawMode = true;
	}

	function applyRawMode() {
		const parsed = parseFmFromEdit(rawYaml, format);
		if (parsed) {
			local = parsed;
			onChange?.(local);
			rawMode = false;
		}
	}

	function cancelRawMode() {
		rawMode = false;
	}
</script>

<div class="fm-panel">
	<div class="fm-header">
		<h3 class="fm-title"><FileEdit size={14} /> Front Matter</h3>
		<div class="fm-header-actions">
			<button
				class="raw-toggle"
				class:active={rawMode}
				onclick={rawMode ? cancelRawMode : enterRawMode}
				title={rawMode ? 'Annuler le mode brut' : 'Mode brut YAML'}
			>
				<Code size={13} />
			</button>
			<button
				class="draft-toggle"
				class:draft={local.draft}
				onclick={() => update('draft', !local.draft)}
				title={local.draft ? 'Publier' : 'Passer en brouillon'}
			>
				{#if local.draft}
					<Send size={13} />
					<span>Publier</span>
				{:else}
					<FileEdit size={13} />
					<span>Brouillon</span>
				{/if}
			</button>
			{#if local.draft}
				<span class="draft-badge"><AlertTriangle size={11} />Brouillon</span>
			{/if}
		</div>
	</div>

	{#if rawMode}
		<div class="raw-editor">
			<textarea
				class="raw-textarea"
				bind:value={rawYaml}
				spellcheck="false"
			></textarea>
			<div class="raw-actions">
				<button class="raw-btn" onclick={cancelRawMode}>Annuler</button>
				<button class="raw-btn primary" onclick={applyRawMode}><Save size={13} /> Appliquer</button>
			</div>
		</div>
	{:else}
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

	<div class="custom-section">
		<button class="section-toggle" onclick={() => showCustomFields = !showCustomFields}>
			<Settings2 size={13} />
			<span>Champs personnalisés</span>
			<span class="badge">{customEntries.length}</span>
		</button>

		{#if showCustomFields}
			<div class="custom-fields" transition:slide>
				{#each customEntries as [key, val]}
					{@const type = getFieldType(val)}
					<div class="custom-row">
						<input
							type="text"
							value={key}
							oninput={(e) => updateCustomKey(key, (e.target as HTMLInputElement).value)}
							class="key-input"
							placeholder="clé"
						/>
						<select
							value={type}
							onchange={(e) => setFieldType(key, type, (e.target as HTMLSelectElement).value as FieldType)}
							class="type-select"
						>
							<option value="string">txt</option>
							<option value="bool">bool</option>
							<option value="list">liste</option>
							<option value="color">coul</option>
						</select>
						{#if type === 'bool'}
							<button
								class="bool-toggle"
								class:active={val === true}
								onclick={() => update(key, !val)}
							>
								{val === true ? 'true' : 'false'}
							</button>
						{:else if type === 'list'}
							<input
								type="text"
								value={formatListForDisplay(val)}
								oninput={(e) => updateCustomValue(key, (e.target as HTMLInputElement).value, type)}
								class="val-input"
								placeholder="val1, val2, val3"
							/>
						{:else if type === 'color'}
							<div class="color-row">
								<input
									type="color"
									value={typeof val === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(val) ? val : '#000000'}
									oninput={(e) => update(key, (e.target as HTMLInputElement).value)}
									class="color-picker"
								/>
								<input
									type="text"
									value={typeof val === 'string' ? val : '#000000'}
									oninput={(e) => {
										const v = (e.target as HTMLInputElement).value;
										if (/^#[0-9a-fA-F]{0,8}$/.test(v)) update(key, v);
									}}
									class="color-input"
									placeholder="#000000"
								/>
							</div>
						{:else}
							<input
								type="text"
								value={typeof val === 'string' ? val : JSON.stringify(val)}
								oninput={(e) => updateCustomValue(key, (e.target as HTMLInputElement).value, type)}
								class="val-input"
								placeholder="valeur"
							/>
						{/if}
						<button class="custom-remove" onclick={() => removeCustomField(key)}>
							<X size={14} />
						</button>
					</div>
				{/each}
				<button class="add-btn" onclick={addCustomField}>
					<Plus size={13} /> Ajouter un champ
				</button>
			</div>
		{/if}
	</div>
	{/if}
</div>

<style>
	.fm-panel {
		padding: 16px;
		font-size: 13px;
	}

	.fm-header {
		margin-bottom: 16px;
	}

	.fm-header-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 6px;
	}

	.fm-title {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 700;
		color: var(--c-text);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.draft-toggle {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		cursor: pointer;
		font-size: 11px;
		font-family: inherit;
		font-weight: 500;
		color: var(--c-text-secondary);
		transition: all 0.12s;
	}

	.draft-toggle.draft {
		background: var(--c-warning-bg);
		border-color: var(--c-warning-border);
		color: var(--c-warning);
	}

	.draft-toggle:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.draft-toggle.draft:hover {
		background: var(--c-warning-border);
	}

	.draft-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		background: var(--c-warning-bg);
		color: var(--c-warning);
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
		background: var(--c-danger-bg);
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

	.section-toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		cursor: pointer;
		font-size: 12px;
		font-family: inherit;
		color: var(--c-text-secondary);
		transition: all 0.12s;
		width: 100%;
	}

	.section-toggle:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.badge {
		font-size: 10px;
		font-weight: 600;
		padding: 1px 5px;
		border-radius: var(--radius-sm);
		background: var(--c-primary-light);
		color: var(--c-primary);
		margin-left: auto;
	}

	.custom-section {
		margin-top: 4px;
	}

	.custom-fields {
		margin-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.custom-row {
		display: flex;
		gap: 4px;
	}

	.custom-row input {
		font-family: var(--font-mono);
		font-size: 12px;
		padding: 5px 6px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		outline: none;
		transition: border-color 0.15s;
	}

	.custom-row input:focus {
		border-color: var(--c-primary);
	}

	.key-input {
		width: 100px;
		flex-shrink: 0;
	}

	.type-select {
		width: 60px;
		flex-shrink: 0;
		font-size: 11px;
		padding: 5px 2px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text-secondary);
		font-family: var(--font-mono);
		cursor: pointer;
		outline: none;
	}

	.type-select:focus {
		border-color: var(--c-primary);
	}

	.bool-toggle {
		flex: 1;
		min-width: 0;
		padding: 5px 6px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text-muted);
		font-family: var(--font-mono);
		font-size: 12px;
		cursor: pointer;
		text-align: center;
		transition: all 0.12s;
	}

	.bool-toggle.active {
		background: var(--c-primary-bg);
		color: var(--c-primary);
		border-color: var(--c-primary-light);
	}

	.color-row {
		flex: 1;
		display: flex;
		gap: 4px;
		min-width: 0;
	}

	.color-picker {
		width: 30px;
		height: 26px;
		padding: 1px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		cursor: pointer;
		flex-shrink: 0;
	}

	.color-picker::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	.color-picker::-webkit-color-swatch {
		border: none;
		border-radius: 2px;
	}

	.color-input {
		flex: 1;
		font-family: var(--font-mono);
		font-size: 12px;
		padding: 5px 6px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		outline: none;
		min-width: 0;
		transition: border-color 0.15s;
	}

	.color-input:focus {
		border-color: var(--c-primary);
	}

	.val-input {
		flex: 1;
		min-width: 0;
	}

	.custom-remove {
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
		flex-shrink: 0;
	}

	.custom-remove:hover {
		background: var(--c-danger-bg);
	}

	.raw-toggle {
		width: 28px;
		height: 28px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		cursor: pointer;
		color: var(--c-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.12s;
		flex-shrink: 0;
	}

	.raw-toggle:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.raw-toggle.active {
		background: var(--c-primary-bg);
		color: var(--c-primary);
		border-color: var(--c-primary-light);
	}

	.raw-editor {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.raw-textarea {
		width: 100%;
		height: 300px;
		padding: 10px 12px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg-muted);
		color: var(--c-text);
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.5;
		resize: vertical;
		outline: none;
		tab-size: 2;
		box-sizing: border-box;
	}

	.raw-textarea:focus {
		border-color: var(--c-primary);
	}

	.raw-actions {
		display: flex;
		gap: 6px;
		justify-content: flex-end;
	}

	.raw-btn {
		padding: 6px 12px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		cursor: pointer;
		font-size: 12px;
		font-family: inherit;
		color: var(--c-text-secondary);
		display: inline-flex;
		align-items: center;
		gap: 4px;
		transition: all 0.12s;
	}

	.raw-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.raw-btn.primary {
		background: var(--c-primary);
		color: #fff;
		border-color: var(--c-primary);
	}

	.raw-btn.primary:hover {
		background: var(--c-primary-hover);
	}
</style>
