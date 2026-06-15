<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { Folder, FileText, RefreshCw, ChevronRight, ArrowUp } from '@lucide/svelte';

	interface ContentMeta {
		type: 'file' | 'directory';
		name: string;
		slug: string;
		path: string;
		frontmatter?: Record<string, unknown>;
	}

	let {
		files = [] as ContentMeta[],
		currentDir = '',
		currentSlug = '',
		onNavigateDir,
		onGoUp,
		onLoadFile,
		onRefresh,
	}: {
		files: ContentMeta[];
		currentDir: string;
		currentSlug: string | null;
		onNavigateDir: (dir: string) => void;
		onGoUp: () => void;
		onLoadFile: (slug: string) => void;
		onRefresh: () => void;
	} = $props();

	function breadcrumbPaths(dir: string): { name: string; path: string }[] {
		const parts = dir.split('/').filter(Boolean);
		const paths: { name: string; path: string }[] = [];
		let acc = '';
		for (const part of parts) {
			acc = acc ? `${acc}/${part}` : part;
			paths.push({ name: part, path: acc });
		}
		return paths;
	}

	let breadcrumbs = $derived(breadcrumbPaths(currentDir));
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<div class="sidebar-brand">
			<FileText size={18} color="var(--c-primary)" />
			<h2>Hugo CMS</h2>
		</div>
		<button class="icon-btn" onclick={onRefresh} title="Rafraîchir">
			<RefreshCw size={16} />
		</button>
	</div>

	<div class="breadcrumb">
		<button class="bread-link" onclick={() => onRefresh()}>root</button>
		{#each breadcrumbs as crumb}
			<span class="bread-sep"><ChevronRight size={10} /></span>
			<button class="bread-link" onclick={() => onNavigateDir(crumb.path)}>{crumb.name}</button>
		{/each}
	</div>

	<nav class="file-tree">
		{#if currentDir}
			<button class="file-item dir-up" onclick={onGoUp}>
				<ArrowUp size={15} />
				<span class="name">..</span>
			</button>
		{/if}

		{#each files as item, i}
			<button
				class="file-item"
				class:active={currentSlug === item.slug}
				class:directory={item.type === 'directory'}
				onclick={() => item.type === 'directory' ? onNavigateDir(item.name) : onLoadFile(item.slug)}
				transition:fade={{ duration: 150, delay: i * 20 }}
			>
				<span class="icon">
					{#if item.type === 'directory'}
						<Folder size={15} />
					{:else}
						<FileText size={15} />
					{/if}
				</span>
				<span class="name">{item.name}</span>
				{#if item.frontmatter?.draft === true}
					<span class="badge-draft">DRAFT</span>
				{/if}
			</button>
		{/each}
	</nav>
</aside>

<style>
	.sidebar {
		width: 260px;
		min-width: 260px;
		border-right: 1px solid var(--c-border);
		background: var(--c-bg-sidebar);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.sidebar-header {
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.sidebar-brand h2 {
		font-size: 15px;
		font-weight: 600;
		color: var(--c-text);
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		cursor: pointer;
		color: var(--c-text-secondary);
		transition: all 0.15s;
	}

	.icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 8px 12px;
		font-size: 12px;
		border-bottom: 1px solid var(--c-border);
		overflow-x: auto;
		white-space: nowrap;
	}

	.bread-link {
		background: none;
		border: none;
		color: var(--c-primary);
		cursor: pointer;
		font-size: 12px;
		padding: 2px 4px;
		border-radius: var(--radius-sm);
		font-family: inherit;
	}

	.bread-link:hover { background: var(--c-primary-bg); }

	.bread-sep {
		display: flex;
		align-items: center;
		color: var(--c-text-muted);
	}

	.file-tree {
		display: flex;
		flex-direction: column;
		padding: 6px;
		gap: 1px;
		flex: 1;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 8px;
		text-align: left;
		padding: 7px 10px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 13px;
		color: var(--c-text-secondary);
		transition: all 0.12s;
		width: 100%;
		font-family: inherit;
	}

	.file-item:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.file-item.active {
		background: var(--c-primary-light);
		color: var(--c-primary);
	}

	.file-item.active .name {
		font-weight: 500;
	}

	.file-item.directory {
		color: var(--c-text);
		font-weight: 500;
	}

	.file-item.dir-up {
		color: var(--c-text-muted);
		font-size: 12px;
		margin-bottom: 2px;
	}

	.icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		opacity: 0.7;
	}

	.file-item.active .icon { opacity: 1; }
	.file-item.directory .icon { opacity: 0.8; }

	.name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badge-draft {
		font-size: 9px;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: 3px;
		background: #fef3c7;
		color: #92400e;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
</style>
