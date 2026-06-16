<script lang="ts">
	import { Folder, ChevronRight, ChevronDown, Map } from '@lucide/svelte';
	import SitemapTreeItem from './SitemapTreeItem.svelte';

	interface TreeNode {
		type: 'file' | 'directory';
		name: string;
		slug: string;
		path: string;
		children?: TreeNode[];
		frontmatter?: Record<string, unknown>;
	}

	let {
		tree = [] as TreeNode[],
		currentSlug = '',
		onLoadFile,
		onRefresh,
	}: {
		tree: TreeNode[];
		currentSlug: string | null;
		onLoadFile: (slug: string) => void;
		onRefresh: () => void;
	} = $props();

	import { untrack } from 'svelte';

	let openDirs = $state<Set<string>>(new Set());

	$effect(() => {
		const slugs = new Set<string>();
		function collect(nodes: TreeNode[]) {
			for (const n of nodes) {
				if (n.type === 'directory') slugs.add(n.slug);
				if (n.children) collect(n.children);
			}
		}
		collect(tree);
		const current = untrack(() => openDirs);
		if (current.size === 0) {
			openDirs = slugs;
		} else {
			const filtered = new Set([...current].filter(s => slugs.has(s)));
			const changed = filtered.size !== current.size;
			if (changed) openDirs = filtered;
		}
	});

	function toggleDir(slug: string) {
		const next = new Set(openDirs);
		if (next.has(slug)) {
			next.delete(slug);
		} else {
			next.add(slug);
		}
		openDirs = next;
	}

	function countFiles(nodes: TreeNode[]): number {
		let count = 0;
		for (const n of nodes) {
			if (n.type === 'file') count++;
			if (n.children) count += countFiles(n.children);
		}
		return count;
	}

	function countDrafts(nodes: TreeNode[]): number {
		let count = 0;
		for (const n of nodes) {
			if (n.type === 'file' && n.frontmatter?.draft === true) count++;
			if (n.children) count += countDrafts(n.children);
		}
		return count;
	}

	const totalFiles = $derived(countFiles(tree));
	const totalDrafts = $derived(countDrafts(tree));
</script>

<div class="sitemap-scroll">
	<div class="sitemap-header">
		<div class="sitemap-title-row">
			<Map size={20} color="var(--c-primary)" />
			<h2>Sitemap</h2>
		</div>
		<div class="sitemap-meta">
			<span class="meta-item">{totalFiles} fichiers</span>
			<span class="meta-dot">·</span>
			<span class="meta-item draft">{totalDrafts} brouillons</span>
			<button class="refresh-btn" onclick={onRefresh} title="Rafraîchir">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
			</button>
		</div>
	</div>

	{#if tree.length === 0}
		<div class="empty-tree">Aucun contenu trouvé</div>
	{:else}
		<div class="sitemap-body">
			{#each tree as node}
				{#if node.type === 'directory'}
					<div class="section-card">
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<div class="section-header" onclick={() => toggleDir(node.slug)} onkeydown={(e) => e.key === 'Enter' && toggleDir(node.slug)} role="button" tabindex="0">
							<span class="section-chevron">
								{#if openDirs.has(node.slug)}
									<ChevronDown size={14} />
								{:else}
									<ChevronRight size={14} />
								{/if}
							</span>
							<Folder size={16} class="section-icon" />
							<span class="section-name">{node.name}</span>
							<span class="section-badge">{countFiles(node.children || [])}</span>
						</div>
						{#if openDirs.has(node.slug)}
							<div class="section-children">
								{#each node.children || [] as child}
									<SitemapTreeItem {child} {currentSlug} {onLoadFile} depth={0} {openDirs} {toggleDir} />
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<div class="sitemap-root-file">
						<SitemapTreeItem child={node} {currentSlug} {onLoadFile} depth={0} {openDirs} {toggleDir} />
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.sitemap-scroll {
		height: 100%;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding: 32px 48px;
		max-width: 900px;
		margin: 0 auto;
		width: 100%;
	}
	.sitemap-scroll::-webkit-scrollbar {
		display: none;
	}

	.sitemap-header {
		margin-bottom: 32px;
	}

	.sitemap-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 6px;
	}

	.sitemap-title-row h2 {
		font-size: 22px;
		font-weight: 700;
		color: var(--c-text);
		margin: 0;
	}

	.sitemap-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--c-text-muted);
		margin-left: 30px;
	}

	.meta-item.draft {
		color: #92400e;
	}

	.meta-dot {
		color: var(--c-border);
	}

	.refresh-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		cursor: pointer;
		color: var(--c-text-muted);
		margin-left: 4px;
		transition: all 0.12s;
	}

	.refresh-btn:hover {
		color: var(--c-text);
		background: var(--c-bg-muted);
	}

	.sitemap-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-card {
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--c-bg);
		transition: box-shadow 0.15s;
	}

	.section-card:hover {
		box-shadow: var(--shadow-sm);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		cursor: pointer;
		background: var(--c-bg-subtle);
		border-bottom: 1px solid var(--c-border);
		font-size: 14px;
		font-weight: 600;
		color: var(--c-text);
		user-select: none;
		transition: background 0.12s;
	}

	.section-header:hover {
		background: var(--c-bg-muted);
	}

	.section-chevron {
		display: flex;
		color: var(--c-text-muted);
	}

	:global(.section-icon) {
		color: var(--c-primary);
		flex-shrink: 0;
	}

	.section-name {
		flex: 1;
	}

	.section-badge {
		font-size: 11px;
		font-weight: 500;
		color: var(--c-text-muted);
		background: var(--c-bg);
		padding: 1px 8px;
		border-radius: 10px;
	}

	.section-children {
		padding: 6px 0;
	}

	.empty-tree {
		text-align: center;
		padding: 48px;
		color: var(--c-text-muted);
		font-size: 14px;
	}

	.sitemap-root-file {
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		background: var(--c-bg);
		padding: 4px 0;
	}
</style>
