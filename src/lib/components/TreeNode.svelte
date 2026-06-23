<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Folder, FileText, ChevronRight, ChevronDown, Trash2, Copy, Check, X, Plus, FolderPlus } from '@lucide/svelte';
	import TreeNode from './TreeNode.svelte';
	import type { TreeNodeData } from '$lib/types';

	let {
		node,
		depth = 0,
		currentSlug = '',
		expandedSlugs = new Set<string>(),
		onLoadFile,
		onDeleteFile,
		onDeleteFolder,
		onRenameFile,
		onDuplicateFile,
		onCreateFileInFolder,
		onCreateFolderInFolder,
		onToggleFolder,
	}: {
		node: TreeNodeData;
		depth: number;
		currentSlug: string | null;
		expandedSlugs?: Set<string>;
		onLoadFile?: (slug: string) => void;
		onDeleteFile?: (slug: string) => void;
		onDeleteFolder?: (slug: string) => void;
		onRenameFile?: (oldSlug: string, newSlug: string) => void;
		onDuplicateFile?: (slug: string) => void;
		onCreateFileInFolder?: (slug: string) => void;
		onCreateFolderInFolder?: (slug: string) => void;
		onToggleFolder?: (slug: string) => void;
	} = $props();

	let editing = $state(false);
	let editValue = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let dragOver = $state(false);

	let open = $derived(node.type === 'directory' ? expandedSlugs.has(node.slug) : false);

	function toggle() {
		onToggleFolder?.(node.slug);
	}

	const hasChildren = $derived(node.type === 'directory' && node.children !== undefined && node.children.length > 0);
	const fileName = $derived(node.name.replace(/\.md$/, ''));

	function startEdit() {
		if (node.type !== 'file') return;
		editValue = fileName;
		editing = true;
	}

	$effect(() => {
		if (editing && inputEl) {
			inputEl.focus();
			inputEl.select();
		}
	});

	function commitEdit() {
		if (!onRenameFile || !editValue.trim()) return;
		const parentDir = node.slug.includes('/') ? node.slug.substring(0, node.slug.lastIndexOf('/') + 1) : '';
		const newName = editValue.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || editValue.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
		const newSlug = parentDir + newName;
		if (newSlug !== node.slug && newName) {
			onRenameFile(node.slug, newSlug);
		}
		editing = false;
	}

	function cancelEdit() {
		editing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitEdit();
		if (e.key === 'Escape') cancelEdit();
	}

	function handleDragStart(e: DragEvent) {
		if (node.type !== 'file' && node.type !== 'directory') return;
		e.dataTransfer?.setData('text/plain', node.slug);
		e.dataTransfer!.effectAllowed = 'move';
	}

	function handleDragOver(e: DragEvent) {
		if (node.type !== 'directory') return;
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (node.type !== 'directory' || !onRenameFile) return;
		const sourceSlug = e.dataTransfer?.getData('text/plain');
		if (!sourceSlug) return;
		const fileName = sourceSlug.includes('/') ? sourceSlug.split('/').pop()! : sourceSlug;
		const newSlug = node.slug ? `${node.slug}/${fileName}` : fileName;
		if (newSlug === sourceSlug) return;
		if (newSlug.startsWith(sourceSlug + '/')) return;
		onRenameFile(sourceSlug, newSlug);
	}
</script>

<div class="tree-node">
	{#if node.type === 'directory'}
	<div class="dir-row">
		<button
			class="tree-item dir"
			class:drag-over={dragOver}
			onclick={toggle}
			title={open ? 'Réduire' : 'Développer'}
			draggable="true"
			ondragstart={handleDragStart}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
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
		{#if onCreateFileInFolder}
			<button class="create-in-folder" onclick={() => onCreateFileInFolder(node.slug)} title="Nouveau fichier dans {node.name}">
				<Plus size={13} />
			</button>
		{/if}
		{#if onCreateFolderInFolder}
			<button class="create-in-folder" onclick={() => onCreateFolderInFolder(node.slug)} title="Nouveau dossier dans {node.name}">
				<FolderPlus size={13} />
			</button>
		{/if}
		{#if onDeleteFolder}
			<button class="delete-dir-btn" onclick={() => onDeleteFolder(node.slug)} title="Supprimer le dossier">
				<Trash2 size={13} />
			</button>
		{/if}
	</div>
		{#if open && hasChildren}
			<div class="children" transition:slide={{ duration: 150 }}>
				{#each node.children! as child}
					<TreeNode node={child} depth={depth + 1} {currentSlug} {expandedSlugs} {onToggleFolder} {onLoadFile} {onDeleteFile} {onDeleteFolder} {onRenameFile} {onDuplicateFile} {onCreateFileInFolder} {onCreateFolderInFolder} />
				{/each}
			</div>
		{/if}
	{:else}
		<div class="file-row">
			{#if editing}
				<div class="rename-wrap">
					<input
						bind:this={inputEl}
						type="text"
						class="rename-input"
						bind:value={editValue}
						onkeydown={handleKeydown}
						onblur={commitEdit}
					/>
					<button class="rename-btn" onclick={commitEdit} title="Valider"><Check size={13} /></button>
					<button class="rename-btn" onclick={cancelEdit} title="Annuler"><X size={13} /></button>
				</div>
			{:else}
				<button
					class="tree-item file"
					class:active={currentSlug === node.slug}
					onclick={() => onLoadFile?.(node.slug)}
					ondblclick={startEdit}
					draggable="true"
					ondragstart={handleDragStart}
				>
					<span class="chevron"></span>
					<span class="icon"><FileText size={15} /></span>
					<span class="name">{node.name}</span>
					{#if node.frontmatter?.draft === true}
						<span class="badge-draft">DRAFT</span>
					{/if}
				</button>
				{#if onDuplicateFile}
					<button class="duplicate-node-btn" onclick={() => onDuplicateFile(node.slug)} title="Dupliquer">
						<Copy size={13} />
					</button>
				{/if}
				{#if onDeleteFile}
					<button class="delete-node-btn" onclick={() => onDeleteFile(node.slug)} title="Supprimer">
						<Trash2 size={13} />
					</button>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.tree-node {
		display: flex;
		flex-direction: column;
	}

	.dir-row {
		display: flex;
		align-items: center;
		gap: 2px;
		position: relative;
	}

	.tree-item {
		display: flex;
		align-items: center;
		gap: 5px;
		text-align: left;
		padding: 5px 66px 5px 0;
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

	.tree-item.dir.drag-over {
		background: var(--c-primary-light);
		color: var(--c-primary);
		border: 1px dashed var(--c-primary);
		padding: 4px 7px;
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

	.create-in-folder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		color: var(--c-text-muted);
		opacity: 0;
		transition: all 0.12s;
		flex-shrink: 0;
		padding: 0;
		position: absolute;
		right: 22px;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Décale le second bouton (FolderPlus) à gauche du premier (Plus).
	   :first-of-type ne marche pas car .tree-item.dir est le premier <button> enfant. */
	.create-in-folder + .create-in-folder {
		right: 44px;
	}

	.tree-node:hover .create-in-folder {
		opacity: 1;
	}
	.create-in-folder:hover {
		background: var(--c-bg-muted);
		color: var(--c-primary);
	}

	.badge-draft {
		font-size: 9px;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: var(--radius-sm);
		background: var(--c-warning-bg);
		color: var(--c-warning);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.children {
		overflow: hidden;
		padding-left: 24px;
	}

	.file-row {
		display: flex;
		align-items: center;
		gap: 2px;
		position: relative;
	}

	.file-row .tree-item {
		flex: 1;
		min-width: 0;
	}

	.delete-node-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--c-text-muted);
		opacity: 0;
		transition: all 0.12s;
		flex-shrink: 0;
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	.file-row:hover .delete-node-btn {
		opacity: 1;
	}

	.delete-node-btn:hover {
		color: var(--c-danger);
		background: var(--c-danger-bg);
	}

	.delete-dir-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--c-text-muted);
		opacity: 0;
		transition: all 0.12s;
		flex-shrink: 0;
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	.dir-row:hover .delete-dir-btn {
		opacity: 1;
	}

	.delete-dir-btn:hover {
		color: var(--c-danger);
		background: var(--c-danger-bg);
	}

	.duplicate-node-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--c-text-muted);
		opacity: 0;
		transition: all 0.12s;
		flex-shrink: 0;
		position: absolute;
		right: 22px;
		top: 50%;
		transform: translateY(-50%);
	}

	.file-row:hover .duplicate-node-btn {
		opacity: 1;
	}

	.duplicate-node-btn:hover {
		color: var(--c-primary);
		background: var(--c-primary-light);
	}

	.rename-wrap {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
		padding: 3px 0;
	}

	.rename-input {
		flex: 1;
		min-width: 0;
		font-size: 13px;
		font-family: inherit;
		padding: 3px 6px;
		border: 1px solid var(--c-primary);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		outline: none;
	}

	.rename-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3px;
		border: 1px solid var(--c-border);
		background: var(--c-bg);
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--c-text-muted);
		transition: all 0.1s;
		flex-shrink: 0;
	}

	.rename-btn:hover {
		color: var(--c-text);
		background: var(--c-bg-muted);
	}
</style>
