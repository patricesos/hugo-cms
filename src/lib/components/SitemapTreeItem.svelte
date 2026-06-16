<script lang="ts">
	import { FileText, Folder, ChevronRight, ChevronDown } from '@lucide/svelte';
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
		child,
		currentSlug,
		onLoadFile,
		depth = 0,
		openDirs,
		toggleDir,
	}: {
		child: TreeNode;
		currentSlug: string | null;
		onLoadFile: (slug: string) => void;
		depth: number;
		openDirs: Set<string>;
		toggleDir: (slug: string) => void;
	} = $props();

	const indent = $derived(Math.min(depth * 20, 120));
</script>

<div class="file-entry" class:active={currentSlug === child.slug} style="padding-left: {indent}px">
	{#if child.type === 'directory'}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="dir-row" onclick={() => toggleDir(child.slug)} onkeydown={(e) => e.key === 'Enter' && toggleDir(child.slug)} role="button" tabindex="0">
			<span class="dir-chevron">
				{#if openDirs.has(child.slug)}
					<ChevronDown size={12} />
				{:else}
					<ChevronRight size={12} />
				{/if}
			</span>
			<Folder size={14} class="icon-folder" />
			<span class="entry-name">{child.name}</span>
		</div>
		{#if openDirs.has(child.slug) && child.children}
			{#each child.children as grandchild}
				<SitemapTreeItem child={grandchild} {currentSlug} {onLoadFile} depth={depth + 1} {openDirs} {toggleDir} />
			{/each}
		{/if}
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="file-row" onclick={() => onLoadFile(child.slug)} onkeydown={(e) => e.key === 'Enter' && onLoadFile(child.slug)} role="button" tabindex="0">
			<FileText size={14} class="icon-file" />
			<span class="entry-name">{child.name}</span>
			{#if child.frontmatter?.draft === true}
				<span class="badge-draft">BROUILLON</span>
			{:else}
				<span class="badge-published">PUBLIÉ</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.file-entry {
		padding: 2px 0;
	}

	.file-entry.active .file-row {
		background: var(--c-primary-light);
	}

	.dir-row {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 14px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		color: var(--c-text-secondary);
		transition: background 0.1s;
	}

	.dir-row:hover {
		background: var(--c-bg-muted);
	}

	.dir-chevron {
		display: flex;
		color: var(--c-text-muted);
		width: 12px;
		justify-content: center;
	}

	.file-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 14px;
		cursor: pointer;
		font-size: 13px;
		color: var(--c-text-secondary);
		border-radius: var(--radius-sm);
		margin: 0 6px;
		transition: all 0.1s;
	}

	.file-row:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.file-entry.active .file-row {
		background: var(--c-primary-light);
		color: var(--c-primary);
	}

	:global(.icon-file), :global(.icon-folder) {
		flex-shrink: 0;
	}

	:global(.icon-file) {
		opacity: 0.6;
	}

	:global(.icon-folder) {
		color: var(--c-primary);
		opacity: 0.8;
	}

	.file-entry.active :global(.icon-file) {
		opacity: 1;
	}

	.entry-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badge-draft {
		font-size: 9px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 3px;
		background: #fef3c7;
		color: #92400e;
		text-transform: uppercase;
		letter-spacing: 0.3px;
		flex-shrink: 0;
	}

	.badge-published {
		font-size: 9px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 3px;
		background: #dcfce7;
		color: #166534;
		text-transform: uppercase;
		letter-spacing: 0.3px;
		flex-shrink: 0;
	}
</style>
