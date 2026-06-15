<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Folder, FileText, ChevronRight, ChevronDown } from '@lucide/svelte';

	interface TreeNodeData {
		type: 'file' | 'directory';
		name: string;
		slug: string;
		path: string;
		children?: TreeNodeData[];
		frontmatter?: Record<string, unknown>;
	}

	let {
		node,
		depth = 0,
		currentSlug = '',
		onLoadFile,
	}: {
		node: TreeNodeData;
		depth: number;
		currentSlug: string | null;
		onLoadFile: (slug: string) => void;
	} = $props();

	let open = $state(false);

	function toggle() {
		open = !open;
	}

	const indent = depth * 16;
	const hasChildren = node.type === 'directory' && node.children !== undefined && node.children.length > 0;
</script>

<div class="tree-node" style="padding-left: {indent}px">
	{#if node.type === 'directory'}
		<button class="tree-item dir" onclick={toggle} title={open ? 'Réduire' : 'Développer'}>
			<span class="chevron">
				{#if open}
					<ChevronDown size={13} />
				{:else}
					<ChevronRight size={13} />
				{/if}
			</span>
			<span class="icon"><Folder size={15} /></span>
			<span class="name">{node.name}</span>
		</button>
		{#if open && hasChildren}
			<div class="children" transition:slide={{ duration: 150 }}>
				{#each node.children! as child}
					<TreeNode {node} {child} depth={depth + 1} {currentSlug} {onLoadFile} />
				{/each}
			</div>
		{/if}
	{:else}
		<button
			class="tree-item file"
			class:active={currentSlug === node.slug}
			onclick={() => onLoadFile(node.slug)}
		>
			<span class="icon"><FileText size={15} /></span>
			<span class="name">{node.name}</span>
			{#if node.frontmatter?.draft === true}
				<span class="badge-draft">DRAFT</span>
			{/if}
		</button>
	{/if}
</div>

<style>
	.tree-node {
		display: flex;
		flex-direction: column;
	}

	.tree-item {
		display: flex;
		align-items: center;
		gap: 5px;
		text-align: left;
		padding: 5px 8px 5px 0;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 13px;
		color: var(--c-text-secondary);
		transition: all 0.12s;
		font-family: inherit;
		width: 100%;
		min-height: 30px;
	}

	.tree-item:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.tree-item.active {
		background: var(--c-primary-light);
		color: var(--c-primary);
	}

	.tree-item.active .name {
		font-weight: 500;
	}

	.tree-item.dir {
		color: var(--c-text);
		font-weight: 500;
	}

	.chevron {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		width: 16px;
		justify-content: center;
		color: var(--c-text-muted);
	}

	.icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		opacity: 0.7;
	}

	.tree-item.active .icon { opacity: 1; }
	.tree-item.dir .icon { opacity: 0.8; }

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

	.children {
		overflow: hidden;
	}
</style>
