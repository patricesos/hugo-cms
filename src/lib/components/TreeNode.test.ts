// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import TreeNode from './TreeNode.svelte';
import type { TreeNodeData } from '$lib/types';

// --- mock des icônes lucide (identique aux autres tests du projet) ---
vi.mock('@lucide/svelte', () => {
	function IconMock(_props: Record<string, unknown>) {
		return { $$render: () => '' };
	}
	const icons = [
		'Folder', 'FileText', 'ChevronRight', 'ChevronDown',
		'Trash2', 'Copy', 'Check', 'X', 'Plus', 'FolderPlus',
	] as const;
	const mod: Record<string, unknown> = {};
	for (const name of icons) mod[name] = IconMock;
	return mod;
});

// Mock de l'API Animation pour les transitions Svelte en jsdom
beforeAll(() => {
	HTMLElement.prototype.animate = vi.fn(() => {
		return { onfinish: null, finish: vi.fn(), cancel: vi.fn() } as unknown as Animation;
	});
	Element.prototype.getAnimations = vi.fn(() => []) as unknown as typeof Element.prototype.getAnimations;

});

afterEach(cleanup);

// --- jeux de données ---
const fileNode: TreeNodeData = {
	type: 'file',
	name: 'about.md',
	slug: 'about',
	path: 'about.md',
};

const draftFile: TreeNodeData = {
	type: 'file',
	name: 'draft.md',
	slug: 'draft',
	path: 'draft.md',
	frontmatter: { draft: true },
};

const publishedFile: TreeNodeData = {
	type: 'file',
	name: 'live.md',
	slug: 'live',
	path: 'live.md',
	frontmatter: { draft: false },
};

const nestedFile: TreeNodeData = {
	type: 'file',
	name: 'hello.md',
	slug: 'blog/hello',
	path: 'blog/hello.md',
};

const dirNode: TreeNodeData = {
	type: 'directory',
	name: 'blog',
	slug: 'blog',
	path: 'blog',
	children: [nestedFile],
};

const emptyDir: TreeNodeData = {
	type: 'directory',
	name: 'empty',
	slug: 'empty',
	path: 'empty',
	children: [],
};

describe('TreeNode', () => {
	// =========== Rendu de base ===========

	it('renders a file name', () => {
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onLoadFile: vi.fn() });
		expect(screen.getByText('about.md')).toBeTruthy();
	});

	it('renders a directory name', () => {
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', onLoadFile: vi.fn() });
		expect(screen.getByText('blog')).toBeTruthy();
	});

	it('shows chevron-right for a closed directory', () => {
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', expandedSlugs: new Set<string>() });
		// La classe active n'est pas sur le chevron lui-même,
		// on vérifie que le titre du bouton est "Développer"
		const dirBtn = screen.getByText('blog').closest('button')!;
		expect(dirBtn.getAttribute('title')).toBe('Développer');
	});

	it('shows chevron-down for an open directory', () => {
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', expandedSlugs: new Set(['blog']) });
		const dirBtn = screen.getByText('blog').closest('button')!;
		expect(dirBtn.getAttribute('title')).toBe('Réduire');
	});

	// =========== Fichier actif ===========

	it('adds active class to the current file', () => {
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: 'about' });
		const fileBtn = screen.getByText('about.md').closest('button')!;
		expect(fileBtn.classList.contains('active')).toBe(true);
	});

	it('does not add active class for a non-matching slug', () => {
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: 'other' });
		const fileBtn = screen.getByText('about.md').closest('button')!;
		expect(fileBtn.classList.contains('active')).toBe(false);
	});

	// =========== Badge DRAFT ===========

	it('shows DRAFT badge when frontmatter.draft is true', () => {
		render(TreeNode, { node: draftFile, depth: 0, currentSlug: '' });
		expect(screen.getByText('DRAFT')).toBeTruthy();
	});

	it('hides DRAFT badge when frontmatter.draft is false', () => {
		render(TreeNode, { node: publishedFile, depth: 0, currentSlug: '' });
		expect(screen.queryByText('DRAFT')).toBeNull();
	});

	it('hides DRAFT badge when no frontmatter', () => {
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '' });
		expect(screen.queryByText('DRAFT')).toBeNull();
	});

	// ========== Chargement de fichier ===========

	it('calls onLoadFile with slug on file click', async () => {
		const onLoadFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onLoadFile });
		const fileBtn = screen.getByText('about.md').closest('button')!;
		await fireEvent.click(fileBtn);
		expect(onLoadFile).toHaveBeenCalledWith('about');
	});

	// =========== Expansion dossier ===========

	it('shows children when expandedSlugs contains the directory slug', () => {
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', expandedSlugs: new Set(['blog']) });
		expect(screen.getByText('hello.md')).toBeTruthy();
	});

	it('hides children when expandedSlugs does not contain the directory slug', () => {
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', expandedSlugs: new Set<string>() });
		expect(screen.queryByText('hello.md')).toBeNull();
	});

	it('calls onToggleFolder when directory is clicked', async () => {
		const onToggleFolder = vi.fn();
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', onToggleFolder });
		const dirBtn = screen.getByText('blog').closest('button')!;
		await fireEvent.click(dirBtn);
		expect(onToggleFolder).toHaveBeenCalledWith('blog');
	});

	it('does not show children for an empty directory even when expanded', () => {
		render(TreeNode, { node: emptyDir, depth: 0, currentSlug: '', expandedSlugs: new Set(['empty']) });
		// Aucun enfant, rien ne devrait être rendu en plus du dossier
		const buttons = document.querySelectorAll('.tree-item');
		expect(buttons.length).toBe(1); // Seul le dossier
	});

	// =========== Boutons d'action ===========

	it('shows delete button for file when onDeleteFile is provided', () => {
		const onDeleteFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onDeleteFile });
		const deleteBtn = document.querySelector('.delete-node-btn');
		expect(deleteBtn).toBeTruthy();
	});

	it('hides delete button for file when onDeleteFile is not provided', () => {
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '' });
		const deleteBtn = document.querySelector('.delete-node-btn');
		expect(deleteBtn).toBeNull();
	});

	it('calls onDeleteFile with slug when delete button is clicked', async () => {
		const onDeleteFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onDeleteFile });
		const deleteBtn = document.querySelector('.delete-node-btn')!;
		await fireEvent.click(deleteBtn);
		expect(onDeleteFile).toHaveBeenCalledWith('about');
	});

	it('shows duplicate button when onDuplicateFile is provided', () => {
		const onDuplicateFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onDuplicateFile });
		const dupBtn = document.querySelector('.duplicate-node-btn');
		expect(dupBtn).toBeTruthy();
	});

	it('calls onDuplicateFile with slug when duplicate button is clicked', async () => {
		const onDuplicateFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onDuplicateFile });
		const dupBtn = document.querySelector('.duplicate-node-btn')!;
		await fireEvent.click(dupBtn);
		expect(onDuplicateFile).toHaveBeenCalledWith('about');
	});

	it('shows delete button for directory when onDeleteFolder is provided', () => {
		const onDeleteFolder = vi.fn();
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', onDeleteFolder });
		const deleteBtn = document.querySelector('.delete-dir-btn');
		expect(deleteBtn).toBeTruthy();
	});

	it('hides delete button for directory when onDeleteFolder is not provided', () => {
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '' });
		const deleteBtn = document.querySelector('.delete-dir-btn');
		expect(deleteBtn).toBeNull();
	});

	it('shows create-file button when onCreateFileInFolder is provided', () => {
		const onCreateFileInFolder = vi.fn();
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', onCreateFileInFolder });
		const createBtn = document.querySelector('.create-in-folder');
		expect(createBtn).toBeTruthy();
	});

	it('shows create-folder button when onCreateFolderInFolder is provided', () => {
		const onCreateFolderInFolder = vi.fn();
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', onCreateFolderInFolder });
		const createBtns = document.querySelectorAll('.create-in-folder');
		expect(createBtns.length).toBeGreaterThanOrEqual(1);
	});

	// =========== Renommage ===========

	it('enters edit mode on double-click', async () => {
		const onRenameFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onRenameFile });
		const fileBtn = screen.getByText('about.md').closest('button')!;
		await fireEvent.dblClick(fileBtn);
		const input = document.querySelector('.rename-input') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe('about');
	});

	it('does not enter edit mode for directories on double-click', async () => {
		const onRenameFile = vi.fn();
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', onRenameFile });
		const dirBtn = screen.getByText('blog').closest('button')!;
		await fireEvent.dblClick(dirBtn);
		const input = document.querySelector('.rename-input');
		expect(input).toBeNull();
	});

	it('commits rename on Enter', async () => {
		const onRenameFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onRenameFile });
		const fileBtn = screen.getByText('about.md').closest('button')!;
		await fireEvent.dblClick(fileBtn);

		const input = document.querySelector('.rename-input')!;
		await fireEvent.input(input, { target: { value: 'renamed' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(onRenameFile).toHaveBeenCalledWith('about', 'renamed');
	});

	it('cancels rename on Escape', async () => {
		const onRenameFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onRenameFile });
		const fileBtn = screen.getByText('about.md').closest('button')!;
		await fireEvent.dblClick(fileBtn);

		const input = document.querySelector('.rename-input')!;
		await fireEvent.keyDown(input, { key: 'Escape' });

		expect(onRenameFile).not.toHaveBeenCalled();
		expect(screen.getByText('about.md')).toBeTruthy();
	});

	it('commits rename on blur', async () => {
		const onRenameFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onRenameFile });
		const fileBtn = screen.getByText('about.md').closest('button')!;
		await fireEvent.dblClick(fileBtn);

		const input = document.querySelector('.rename-input')!;
		await fireEvent.input(input, { target: { value: 'renamed' } });
		await fireEvent.blur(input);

		expect(onRenameFile).toHaveBeenCalledWith('about', 'renamed');
	});

	// =========== Drag & Drop ===========

	it('sets draggable attribute on file buttons', () => {
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '' });
		const fileBtn = screen.getByText('about.md').closest('[draggable="true"]')!;
		expect(fileBtn).toBeTruthy();
	});

	it('fires dragstart with slug data on files', () => {
		const onRenameFile = vi.fn();
		render(TreeNode, { node: fileNode, depth: 0, currentSlug: '', onRenameFile });
		const fileBtn = screen.getByText('about.md').closest('button')!;

		const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
		fireEvent.dragStart(fileBtn, { dataTransfer });

		expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'about');
	});

	it('adds drag-over class on directories during dragover', async () => {
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '' });
		const dirBtn = screen.getByText('blog').closest('button')!;
		await fireEvent.dragOver(dirBtn);
		expect(dirBtn.classList.contains('drag-over')).toBe(true);
	});

	it('removes drag-over class on dragleave', async () => {
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '' });
		const dirBtn = screen.getByText('blog').closest('button')!;
		await fireEvent.dragOver(dirBtn);
		await fireEvent.dragLeave(dirBtn);
		expect(dirBtn.classList.contains('drag-over')).toBe(false);
	});

	it('calls onRenameFile on drop into directory', async () => {
		const onRenameFile = vi.fn();
		render(TreeNode, { node: dirNode, depth: 0, currentSlug: '', onRenameFile });
		const dirBtn = screen.getByText('blog').closest('button')!;

		const dt = { getData: vi.fn(() => 'about'), setData: vi.fn() };
		await fireEvent.drop(dirBtn, { dataTransfer: dt });

		expect(onRenameFile).toHaveBeenCalledWith('about', 'blog/about');
	});
});
