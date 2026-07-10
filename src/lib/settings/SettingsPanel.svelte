<script lang="ts">
	import type { SettingTab } from './schema';
	import SettingField from './SettingField.svelte';

	let { schema, values, serverConfig = null, onChange }: {
		schema: SettingTab[];
		values: Record<string, any>;
		serverConfig?: Record<string, string | number | boolean> | null;
		onChange: (key: string, value: unknown) => void;
	} = $props();

	let activeTab = $state('');
	let searchQuery = $state('');

	let currentTab = $derived(schema.find(t => t.id === activeTab));

	$effect(() => {
		if (schema.length > 0 && !currentTab) {
			activeTab = schema[0].id;
		}
	});

	let isSearching = $derived(searchQuery.trim().length > 0);

	let filteredGroups = $derived.by(() => {
		if (!currentTab) return [];
		if (currentTab.id === 'advanced') {
			return currentTab.groups
				.map(group => ({
					...group,
					fields: group.fields.filter(f => {
						if (f.key === 'hugoSitePathCustom') {
							return values[f.key] !== undefined && !values.hugoSitePathUseDotEnv;
						}
						return true;
					}),
				}))
				.filter(g => g.fields.length > 0);
		}
		const q = searchQuery.toLowerCase().trim();
		return currentTab.groups
			.map(group => ({
				...group,
				fields: group.fields.filter(f => {
					if (!q) return true;
					return f.label.toLowerCase().includes(q)
						|| (f.description?.toLowerCase().includes(q) ?? false);
				}),
			}))
			.filter(g => g.fields.length > 0);
	});

	function handleFieldChange(key: string, val: any) {
		onChange(key, val);
	}
</script>

<div class="panel">
	<nav class="tab-nav">
		{#each schema as tab (tab.id)}
			<button
				class="tab-btn"
				class:active={tab.id === activeTab}
				onclick={() => { activeTab = tab.id; searchQuery = ''; }}
			>
				{tab.label}
			</button>
		{/each}
	</nav>

	<div class="content">
		<div class="search-row">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
			<input
				type="text"
				placeholder="Rechercher un paramètre…"
				bind:value={searchQuery}
				class="search-input"
			/>
			{#if isSearching}
				<button class="clear-btn" onclick={() => searchQuery = ''}>✕</button>
			{/if}
		</div>

		<div class="fields-scroll">
		{#if filteredGroups.length > 0 || activeTab === 'advanced'}
			{#each filteredGroups as group, i (group.label || i)}
				{#if group.label && !isSearching}
					<div class="group-label">{group.label}</div>
				{/if}
				{#each group.fields as field (field.key)}
					{@const isDisabled = field.key === 'hugoSitePathCustom' && !!values.hugoSitePathUseDotEnv}
					<div class="field-row" class:disabled={isDisabled}>
						<SettingField
							field={field as any}
							value={values[field.key]}
							onChange={handleFieldChange}
						/>
					</div>
				{/each}
			{/each}
			{#if activeTab === 'advanced' && serverConfig}
				<div class="group-label">Configuration serveur</div>
				<div class="advanced-section">
					{#each Object.entries(serverConfig) as [key, val] (key)}
						<div class="readonly-row">
							<span class="readonly-key">{key}</span>
							<span class="readonly-val">{String(val)}</span>
						</div>
					{/each}
				</div>
			{/if}
		{:else if isSearching && filteredGroups.length === 0}
			<div class="empty-state">Aucun résultat pour « {searchQuery} »</div>
		{/if}
	</div>
	</div>
</div>

<style>
	.panel {
		display: flex;
		flex-direction: row;
		gap: 0;
		height: 100%;
	}

	.tab-nav {
		display: flex;
		flex-direction: column;
		gap: 0;
		border-right: 1px solid var(--c-border);
		flex-shrink: 0;
		width: 130px;
		padding: 8px 0;
	}

	.tab-btn {
		flex: none;
		padding: 9px 14px;
		border: none;
		background: transparent;
		color: var(--c-text-muted);
		font-size: 12px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		border-left: 3px solid transparent;
		transition: all 0.12s;
		text-align: left;
		width: 100%;
	}

	.tab-btn:hover {
		color: var(--c-text);
		background: var(--c-bg-muted);
	}

	.tab-btn.active {
		color: var(--c-primary);
		border-left-color: var(--c-primary);
		background: color-mix(in srgb, var(--c-primary) 8%, transparent);
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		padding-left: 16px;
	}

	.search-row {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 0;
		border-bottom: 1px solid var(--c-border);
		flex-shrink: 0;
	}

	.search-icon {
		flex-shrink: 0;
		color: var(--c-text-muted);
	}

	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		outline: none;
	}

	.search-input::placeholder {
		color: var(--c-text-muted);
	}

	.clear-btn {
		border: none;
		background: transparent;
		color: var(--c-text-muted);
		cursor: pointer;
		font-size: 12px;
		padding: 2px 4px;
		line-height: 1;
	}

	.clear-btn:hover {
		color: var(--c-text);
	}

	.fields-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 0;
	}

	.group-label {
		font-size: 10px;
		font-weight: 600;
		color: var(--c-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding: 10px 0 4px;
	}

	.field-row.disabled {
		opacity: 0.4;
		pointer-events: none;
	}

	.advanced-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 4px 0;
	}

	.readonly-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 0;
		font-size: 12px;
		color: var(--c-text-muted);
	}

	.readonly-key {
		font-size: 12px;
	}

	.readonly-val {
		font-size: 12px;
		font-family: monospace;
		color: var(--c-text-secondary);
	}

	.empty-state {
		padding: 24px 0;
		text-align: center;
		font-size: 12px;
		color: var(--c-text-muted);
	}
</style>
