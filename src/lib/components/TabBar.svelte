<script lang="ts">
	import { X, FileText, FileImage, FileCode, Settings } from '@lucide/svelte';

	interface Tab {
		slug: string;
		title: string;
		frontmatter: Record<string, unknown>;
		kind: 'content' | 'static' | 'archetype' | 'config';
	}

	let {
		tabs = [] as Tab[],
		activeSlug = '',
		onSelect,
		onClose,
	}: {
		tabs: Tab[];
		activeSlug: string;
		onSelect: (slug: string) => void;
		onClose: (slug: string) => void;
	} = $props();
</script>

<div class="tab-bar">
	{#each tabs as tab (tab.slug)}
		<button
			class="tab"
			class:active={tab.slug === activeSlug}
			onclick={() => onSelect(tab.slug)}
			onmousedown={(e) => { if (e.button === 1) { e.preventDefault(); onClose(tab.slug); } }}
			title={tab.kind === 'content' ? `${tab.slug}.md` : tab.slug}
		>
			{#if tab.kind === 'static'}
				<FileImage size={12} />
			{:else if tab.kind === 'archetype'}
				<FileCode size={12} />
			{:else if tab.kind === 'config'}
				<Settings size={12} />
			{:else}
				<FileText size={12} />
			{/if}
			<span class="tab-title">{tab.title || tab.slug.split('/').pop()}</span>
			<span
				class="tab-close"
				role="button"
				tabindex="0"
				onclick={(e) => { e.stopPropagation(); onClose(tab.slug); }}
				onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onClose(tab.slug); } }}
				title="Fermer"
			><X size={12} /></span>
		</button>
	{/each}
</div>

<style>
	.tab-bar {
		display: flex;
		align-items: center;
		gap: 0;
		padding: 0 8px;
		background: var(--c-bg-subtle);
		border-bottom: 1px solid var(--c-border);
		flex-shrink: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 6px 6px 6px 10px;
		border: none;
		border-right: 1px solid var(--c-border);
		background: transparent;
		cursor: pointer;
		font-size: 12px;
		font-family: inherit;
		color: var(--c-text-secondary);
		white-space: nowrap;
		transition: all 0.1s;
		position: relative;
	}

	.tab:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.tab.active {
		background: var(--c-bg);
		color: var(--c-text);
		font-weight: 500;
	}

	.tab.active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--c-primary);
	}

	.tab-title {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tab-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		padding: 0;
		border: none;
		border-radius: 3px;
		background: transparent;
		cursor: pointer;
		color: var(--c-text-muted);
		flex-shrink: 0;
		opacity: 0;
		transition: all 0.1s;
	}

	.tab:hover .tab-close,
	.tab.active .tab-close {
		opacity: 1;
	}

	.tab-close:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}
</style>
