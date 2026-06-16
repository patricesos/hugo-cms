<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Zap, X, Search, FileCode, Braces, Type, Lightbulb, Loader2 } from '@lucide/svelte';

	interface ShortcodeParam {
		name: string;
		type: 'positional' | 'named';
		required: boolean;
		defaultValue?: string;
		description: string;
	}

	interface ShortcodeDef {
		name: string;
		source: 'native' | 'custom' | 'theme';
		description: string;
		params: ShortcodeParam[];
		body: boolean;
		example: string;
	}

	let {
		show = false,
		onInsert,
		onClose,
	}: {
		show: boolean;
		onInsert: (shortcode: string) => void;
		onClose: () => void;
	} = $props();

	let shortcodes = $state<ShortcodeDef[]>([]);
	let loading = $state(false);
	let query = $state('');
	let selectedName = $state<string | null>(null);
	let paramValues = $state<Record<string, string>>({});
	let innerText = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (show) {
			selectedName = null;
			paramValues = {};
			innerText = '';
			query = '';
			loadShortcodes();
		}
	});

	$effect(() => {
		if (show && inputEl) {
			inputEl.focus();
		}
	});

	async function loadShortcodes() {
		loading = true;
		try {
			const res = await fetch('/api/shortcodes');
			shortcodes = await res.json();
		} catch {
			shortcodes = [];
		} finally {
			loading = false;
		}
	}

	const selected = $derived(shortcodes.find((s) => s.name === selectedName) || null);

	const customShortcodes = $derived(shortcodes.filter((s) => s.source === 'custom'));
	const nativeShortcodes = $derived(shortcodes.filter((s) => s.source === 'native'));

	function fuzzyMatch(text: string, q: string): boolean {
		const lower = text.toLowerCase();
		const qLower = q.toLowerCase();
		let qi = 0;
		for (let i = 0; i < lower.length && qi < qLower.length; i++) {
			if (lower[i] === qLower[qi]) qi++;
		}
		return qi === qLower.length;
	}

	const filteredCustom = $derived(
		!query ? customShortcodes : customShortcodes.filter(
			(s) => fuzzyMatch(s.name, query) || fuzzyMatch(s.description, query),
		),
	);
	const filteredNative = $derived(
		!query ? nativeShortcodes : nativeShortcodes.filter(
			(s) => fuzzyMatch(s.name, query) || fuzzyMatch(s.description, query),
		),
	);

	function selectShortcode(sc: ShortcodeDef) {
		selectedName = sc.name;
		paramValues = {};
		innerText = '';
		for (const p of sc.params) {
			if (p.defaultValue !== undefined) {
				paramValues[p.name] = p.defaultValue;
			}
		}
	}

	function buildShortcode(): string {
		if (!selected) return '';
		const parts: string[] = [];
		const seenNamed = new Set<string>();

		for (const p of selected.params) {
			const val = paramValues[p.name]?.trim() || '';
			if (!val && p.required) return '';
			if (!val) continue;
			if (p.type === 'positional') {
				parts.push(val);
			} else {
				parts.push(`${p.name}="${val}"`);
				seenNamed.add(p.name);
			}
		}

		let sc = `{{< ${selected.name} ${parts.join(' ')} >}}`;
		if (selected.body && innerText.trim()) {
			sc += `\n${innerText.trimEnd()}\n{{< /${selected.name} >}}`;
		}
		return sc;
	}

	const preview = $derived(selected ? buildShortcode() || selected.example : '');

	function handleInsert() {
		const sc = buildShortcode();
		if (!sc) return;
		onInsert(sc);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleInsert();
		} else if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if show}
	<div class="sc-backdrop" role="presentation" transition:fade={{ duration: 100 }} onclick={onClose}></div>
	<div class="sc-dialog" role="dialog" tabindex="-1" transition:fade={{ duration: 120 }} onkeydown={handleKeydown}>
		<div class="sc-header">
			<Zap size={16} />
			<span>Insérer un shortcode Hugo</span>
			<button class="sc-close" onclick={onClose} title="Fermer"><X size={16} /></button>
		</div>

		<div class="sc-search">
			<Search size={14} />
			<input
				bind:this={inputEl}
				type="text"
				class="sc-search-input"
				placeholder="Rechercher un shortcode…"
				bind:value={query}
			/>
		</div>

		<div class="sc-body">
			<div class="sc-list">
				{#if loading}
					<div class="sc-loading"><Loader2 size={20} style="animation: spin 0.8s linear infinite;" /></div>
				{:else if filteredCustom.length === 0 && filteredNative.length === 0}
					<div class="sc-empty">Aucun shortcode trouvé</div>
				{:else}
					{#if filteredCustom.length > 0}
						<div class="sc-group-label">Personnalisés</div>
						{#each filteredCustom as sc}
							<button
								class="sc-item"
								class:selected={sc.name === selectedName}
								onclick={() => selectShortcode(sc)}
							>
								<span class="sc-item-icon"><FileCode size={14} /></span>
								<span class="sc-item-name">{sc.name}</span>
								<span class="sc-item-desc">{sc.description}</span>
							</button>
						{/each}
					{/if}

					{#if filteredNative.length > 0}
						<div class="sc-group-label">Natifs</div>
						{#each filteredNative as sc}
							<button
								class="sc-item"
								class:selected={sc.name === selectedName}
								onclick={() => selectShortcode(sc)}
							>
								<span class="sc-item-icon"><Zap size={14} /></span>
								<span class="sc-item-name">{sc.name}</span>
								<span class="sc-item-desc">{sc.description}</span>
							</button>
						{/each}
					{/if}
				{/if}
			</div>

			<div class="sc-detail" class:active={selected}>
				{#if selected}
					<div class="sc-detail-header">
						<code class="sc-detail-name">{selected.name}</code>
						<span class="sc-detail-source">{selected.source === 'custom' ? 'Personnalisé' : 'Natiiif'}</span>
					</div>

					{#if selected.params.length > 0}
						<div class="sc-params">
							{#each selected.params as p}
								<label class="sc-field">
									<span class="sc-label">
										<Braces size={12} />
										{p.name}
										{#if p.required}<span class="sc-required">*</span>{/if}
										{#if p.defaultValue !== undefined}
											<span class="sc-default">défaut : {p.defaultValue}</span>
										{/if}
									</span>
									<input
										type="text"
										class="sc-input"
										placeholder={p.description}
										bind:value={paramValues[p.name]}
									/>
								</label>
							{/each}
						</div>
					{/if}

					{#if selected.body}
						<label class="sc-field">
							<span class="sc-label"><Type size={12} /> Contenu</span>
							<textarea
								class="sc-textarea"
								placeholder="Contenu à encadrer par le shortcode…"
								bind:value={innerText}
								rows={2}
							></textarea>
						</label>
					{/if}

					<div class="sc-example">
						<span class="sc-example-label"><Lightbulb size={12} /> Exemple</span>
						<code class="sc-example-code">{preview}</code>
					</div>
				{:else}
					<div class="sc-detail-empty">
						Sélectionnez un shortcode dans la liste
					</div>
				{/if}
			</div>
		</div>

		<div class="sc-footer">
			<button class="sc-btn secondary" onclick={onClose}>Annuler</button>
			<button class="sc-btn primary" onclick={handleInsert} disabled={!selected}>Insérer</button>
		</div>
	</div>
{/if}

<style>
	.sc-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.35);
		z-index: 200;
	}

	.sc-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 620px;
		max-width: calc(100vw - 40px);
		max-height: calc(100vh - 80px);
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xl);
		z-index: 201;
		display: flex;
		flex-direction: column;
	}

	.sc-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}

	.sc-close {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--c-text-muted);
		transition: all 0.1s;
	}

	.sc-close:hover { background: var(--c-bg-muted); color: var(--c-text); }

	.sc-search {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--c-border);
		color: var(--c-text-muted);
	}

	.sc-search-input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-size: 13px;
		font-family: inherit;
		color: var(--c-text);
	}

	.sc-search-input::placeholder { color: var(--c-text-muted); }

	.sc-body {
		display: flex;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.sc-list {
		width: 220px;
		flex-shrink: 0;
		overflow-y: auto;
		padding: 8px;
		border-right: 1px solid var(--c-border);
	}

	.sc-loading, .sc-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px 0;
		color: var(--c-text-muted);
		font-size: 13px;
	}

	.sc-group-label {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--c-text-muted);
		padding: 6px 8px 4px;
	}

	.sc-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 7px 8px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		font-size: 12px;
		transition: all 0.08s;
	}

	.sc-item:hover { background: var(--c-bg-muted); }
	.sc-item.selected { background: var(--c-primary-light); }

	.sc-item-icon {
		display: flex;
		align-items: center;
		color: var(--c-text-muted);
		flex-shrink: 0;
	}

	.sc-item.selected .sc-item-icon { color: var(--c-primary); }

	.sc-item-name {
		font-weight: 600;
		color: var(--c-text);
		font-family: var(--font-mono);
		font-size: 12px;
		flex-shrink: 0;
	}

	.sc-item-desc {
		font-size: 11px;
		color: var(--c-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sc-detail {
		flex: 1;
		padding: 14px 16px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.sc-detail:not(.active) { justify-content: center; }

	.sc-detail-empty {
		text-align: center;
		color: var(--c-text-muted);
		font-size: 13px;
	}

	.sc-detail-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.sc-detail-name {
		font-family: var(--font-mono);
		font-size: 16px;
		font-weight: 700;
		color: var(--c-text);
	}

	.sc-detail-source {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--c-bg-muted);
		color: var(--c-text-muted);
	}

	.sc-params {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.sc-field {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.sc-label {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-weight: 600;
		color: var(--c-text-secondary);
	}

	.sc-required {
		color: var(--c-danger, #e53e3e);
		margin-left: 1px;
	}

	.sc-default {
		font-weight: 400;
		color: var(--c-text-muted);
		margin-left: auto;
	}

	.sc-input {
		padding: 6px 8px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 13px;
		font-family: var(--font-mono);
		outline: none;
		transition: border-color 0.12s;
	}

	.sc-input:focus { border-color: var(--c-primary); }
	.sc-input::placeholder { color: var(--c-text-muted); font-family: inherit; }

	.sc-textarea {
		padding: 6px 8px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 13px;
		font-family: var(--font-mono);
		outline: none;
		resize: vertical;
		min-height: 40px;
		transition: border-color 0.12s;
	}

	.sc-textarea:focus { border-color: var(--c-primary); }
	.sc-textarea::placeholder { color: var(--c-text-muted); font-family: inherit; }

	.sc-example {
		background: var(--c-bg-muted);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		padding: 8px 10px;
	}

	.sc-example-label {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--c-text-muted);
		margin-bottom: 6px;
	}

	.sc-example-code {
		display: block;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--c-text);
		word-break: break-all;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.sc-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--c-border);
	}

	.sc-btn {
		padding: 7px 16px;
		border-radius: var(--radius-md);
		border: 1px solid var(--c-border);
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.1s;
	}

	.sc-btn.primary {
		background: var(--c-primary);
		color: #fff;
		border-color: var(--c-primary);
	}

	.sc-btn.primary:hover { opacity: 0.9; }
	.sc-btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }
	.sc-btn.secondary { background: var(--c-bg); color: var(--c-text); }
	.sc-btn.secondary:hover { background: var(--c-bg-muted); }

	@keyframes spin { to { transform: rotate(360deg); } }
</style>
