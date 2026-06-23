// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import Sidebar from './Sidebar.svelte';

// Mock des API DOM manquantes dans jsdom (transitions Svelte, animation)
beforeAll(() => {
	// Mock de element.animate pour les transitions Svelte (slide) en jsdom.
	// On ignore les callbacks onfinish ; la fermeture du dropdown est testée
	// via aria-expanded (synchronisé avec l'état Svelte, pas l'animation).
	HTMLElement.prototype.animate = vi.fn<(...args: unknown[]) => Animation>(() => ({ onfinish: null, finish: vi.fn(), cancel: vi.fn() } as unknown as Animation),);
	Element.prototype.getAnimations = vi.fn(() => []) as unknown as typeof Element.prototype.getAnimations;
});

// --- mock des icônes lucide (identique aux autres tests du projet) ---
vi.mock('@lucide/svelte', () => {
	function IconMock(_props: Record<string, unknown>) {
		return { $$render: () => '' };
	}
	const icons = [
		'Image', 'FileText', 'FileCode', 'Settings', 'Layers',
		'ChevronLeft', 'ChevronRight', 'ChevronDown',
		'Folder', 'Trash2', 'Copy', 'Check', 'X',
		'Plus', 'FolderPlus',
	] as const;
	const mod: Record<string, unknown> = {};
	for (const name of icons) mod[name] = IconMock;
	return mod;
});

afterEach(cleanup);

describe('Sidebar', () => {
	// Arbres plats (sans sous-dossiers) pour la plupart des tests
	const flatTree = [
		{ type: 'file' as const, name: 'about.md', slug: 'about', path: 'about.md' },
		{ type: 'file' as const, name: 'contact.md', slug: 'contact', path: 'contact.md' },
	];

	const treeWithDir = [
		{
			type: 'directory' as const,
			name: 'blog',
			slug: 'blog',
			path: 'blog',
			children: [
				{ type: 'file' as const, name: 'hello.md', slug: 'blog/hello', path: 'blog/hello.md' },
				{ type: 'file' as const, name: 'tips.md', slug: 'blog/tips', path: 'blog/tips.md' },
			],
		},
		{ type: 'file' as const, name: 'about.md', slug: 'about', path: 'about.md' },
	];

	const assetTree = [
		{ type: 'file' as const, name: 'logo.png', slug: 'images/logo.png', path: 'images/logo.png' },
	];

	const archetypeTree = [
		{ type: 'file' as const, name: 'post', slug: 'post', path: 'post' },
	];

	const configTree = [
		{ type: 'file' as const, name: 'hugo.yaml', slug: 'hugo.yaml', path: 'hugo.yaml' },
	];

	// Helper pour créer un Set d'expandedSlugs avec son toggle
	function makeExpandable(onToggleFolder?: (slug: string) => void) {
		const expandedSlugs = new Set<string>();
		const handleToggle = (slug: string) => {
			if (expandedSlugs.has(slug)) expandedSlugs.delete(slug);
			else expandedSlugs.add(slug);
			onToggleFolder?.(slug);
		};
		return { expandedSlugs, handleToggle };
	}

	// =========== Rendu et structure ===========

	it('renders the sidebar element', () => {
		const { container } = render(Sidebar, { tree: flatTree });
		expect(container.querySelector('.sidebar')).toBeTruthy();
	});

	it('shows "Content" as default view label', () => {
		render(Sidebar, { tree: flatTree });
		expect(screen.getByText('Content')).toBeTruthy();
	});

	it('renders file names from the flat tree', () => {
		render(Sidebar, { tree: flatTree });
		expect(screen.getByText('about.md')).toBeTruthy();
		expect(screen.getByText('contact.md')).toBeTruthy();
	});

	it('renders directory names in the tree', () => {
		render(Sidebar, { tree: treeWithDir });
		expect(screen.getByText('blog')).toBeTruthy();
	});

	it('shows children when expandedSlugs contains the directory', () => {
		render(Sidebar, {
			tree: treeWithDir,
			expandedSlugs: new Set(['blog']),
		});
		expect(screen.getByText('hello.md')).toBeTruthy();
		expect(screen.getByText('tips.md')).toBeTruthy();
	});

	it('hides children when expandedSlugs does not contain the directory', () => {
		render(Sidebar, {
			tree: treeWithDir,
			expandedSlugs: new Set<string>(),
		});
		expect(screen.queryByText('hello.md')).toBeNull();
		expect(screen.queryByText('tips.md')).toBeNull();
	});

	it('does not crash with an empty tree', () => {
		render(Sidebar, { tree: [], assetTree: [], archetypeTree: [], configTree: [], currentSlug: '', onLoadFile: vi.fn() });
		expect(screen.getByText('Content')).toBeTruthy();
	});

	it('has aria-label "Vue" on the view selector', () => {
		render(Sidebar, { tree: flatTree });
		const selector = screen.getByRole('combobox');
		expect(selector.getAttribute('aria-label')).toBe('Vue');
	});

	// =========== Navigation par vue (dropdown) ===========

	it('has a dropdown trigger button', () => {
		render(Sidebar, { tree: flatTree });
		const trigger = screen.getByRole('combobox').querySelector('button');
		expect(trigger).toBeTruthy();
	});

	it('shows all five view options in the dropdown when opened', async () => {
		render(Sidebar, { tree: flatTree });

		const trigger = screen.getByRole('combobox').querySelector('button')!;
		await fireEvent.click(trigger);

		// "Tout" apparaît dans le dropdown uniquement
		expect(screen.getByText('Tout')).toBeTruthy();

		// Les autres vues : "Content" apparaît 2 fois (trigger + dropdown)
		expect(screen.getAllByText('Content').length).toBe(2);
		expect(screen.getByText('Static')).toBeTruthy();
		expect(screen.getByText('Archétypes')).toBeTruthy();
		expect(screen.getByText('Config')).toBeTruthy();
	});

	it('closes the dropdown on view selection', async () => {
		render(Sidebar, { tree: flatTree });

		const trigger = screen.getByRole('combobox').querySelector('button')!;
		await fireEvent.click(trigger);
		expect(screen.getByRole('listbox')).toBeTruthy();

		// Sélectionne "Config" dans le dropdown
		const options = document.querySelectorAll('.view-dropdown-item');
		const configBtn = Array.from(options).find(b => b.textContent?.trim() === 'Config')!;
		await fireEvent.mouseDown(configBtn);

		// L'élément DOM (listbox) reste le temps de l'outro transition,
		// mais l'état Svelte dropdownOpen est déjà false → aria-expanded="false".
		const combo = screen.getByRole('combobox');
		expect(combo.getAttribute('aria-expanded')).toBe('false');
	});

	it('calls onViewChange with the correct view name for each dropdown item', async () => {
		const onViewChange = vi.fn();
		render(Sidebar, { tree: flatTree, onViewChange });

		const trigger = screen.getByRole('combobox').querySelector('button')!;
		await fireEvent.click(trigger);

		const checks: { name: string; expected: string }[] = [
			{ name: 'Static', expected: 'static' },
			{ name: 'Archétypes', expected: 'archetypes' },
			{ name: 'Config', expected: 'config' },
		];

		// Chaque sélection déclenche setView → dropdownOpen = false,
		// mais l'élément DOM reste (outro transition en cours).
		// Les options suivantes sont donc encore trouvables via getByRole.
		for (const { name, expected } of checks) {
			onViewChange.mockClear();
			const option = screen.getByRole('option', { name });
			await fireEvent.mouseDown(option);
			expect(onViewChange).toHaveBeenCalledWith(expected);
		}
	});

	// =========== Changement de vue ===========

	it('renders config tree nodes when sidebarView=config', () => {
		render(Sidebar, {
			tree: flatTree,
			configTree,
			sidebarView: 'config',
		});
		expect(screen.getByText('hugo.yaml')).toBeTruthy();
	});

	it('renders archetype tree nodes when sidebarView=archetypes', () => {
		render(Sidebar, {
			tree: flatTree,
			archetypeTree,
			sidebarView: 'archetypes',
		});
		expect(screen.getByText('post')).toBeTruthy();
	});

	it('renders asset tree nodes when sidebarView=static', () => {
		render(Sidebar, {
			tree: flatTree,
			assetTree,
			sidebarView: 'static',
		});
		expect(screen.getByText('logo.png')).toBeTruthy();
	});

	it('does not render content files in static view', () => {
		render(Sidebar, {
			tree: flatTree,
			sidebarView: 'static',
		});
		expect(screen.queryByText('about.md')).toBeNull();
	});

	it('shows "Static" label when sidebarView=static', () => {
		render(Sidebar, { tree: flatTree, sidebarView: 'static' });
		expect(screen.getByText('Static')).toBeTruthy();
	});

	// =========== Callbacks ===========

	it('calls onLoadFile with slug when a file is clicked', async () => {
		const onLoadFile = vi.fn();
		render(Sidebar, { tree: flatTree, onLoadFile });

		const fileBtn = screen.getByText('about.md').closest('button')!;
		await fireEvent.click(fileBtn);
		expect(onLoadFile).toHaveBeenCalledWith('about');
	});

	it('calls onLoadFile for each file in the tree', async () => {
		const onLoadFile = vi.fn();
		render(Sidebar, { tree: flatTree, onLoadFile });

		const aboutBtn = screen.getByText('about.md').closest('button')!;
		await fireEvent.click(aboutBtn);
		expect(onLoadFile).toHaveBeenCalledWith('about');

		const contactBtn = screen.getByText('contact.md').closest('button')!;
		await fireEvent.click(contactBtn);
		expect(onLoadFile).toHaveBeenCalledWith('contact');
	});

	it('calls onSelectAsset in static view', async () => {
		const onSelectAsset = vi.fn();
		render(Sidebar, {
			tree: flatTree,
			assetTree,
			sidebarView: 'static',
			onSelectAsset,
			currentSlug: '',
			onLoadFile: vi.fn(),
		});

		const assetBtn = screen.getByText('logo.png').closest('button')!;
		await fireEvent.click(assetBtn);
		expect(onSelectAsset).toHaveBeenCalledWith('images/logo.png');
	});

	it('calls onSelectConfig in config view', async () => {
		const onSelectConfig = vi.fn();
		render(Sidebar, {
			tree: flatTree,
			configTree,
			sidebarView: 'config',
			onSelectConfig,
			currentSlug: '',
			onLoadFile: vi.fn(),
		});

		const configBtn = screen.getByText('hugo.yaml').closest('button')!;
		await fireEvent.click(configBtn);
		expect(onSelectConfig).toHaveBeenCalledWith('hugo.yaml');
	});

	it('calls onSelectArchetype in archetypes view', async () => {
		const onSelectArchetype = vi.fn();
		render(Sidebar, {
			tree: flatTree,
			archetypeTree,
			sidebarView: 'archetypes',
			onSelectArchetype,
			currentSlug: '',
			onLoadFile: vi.fn(),
		});

		const archetypeBtn = screen.getByText('post').closest('button')!;
		await fireEvent.click(archetypeBtn);
		expect(onSelectArchetype).toHaveBeenCalledWith('post');
	});

	// =========== État actif ===========

	it('highlights the active file via currentSlug', () => {
		render(Sidebar, { tree: flatTree, currentSlug: 'about' });

		const fileBtn = screen.getByText('about.md').closest('button')!;
		expect(fileBtn.classList.contains('active')).toBe(true);
	});

	it('does not highlight non-active files', () => {
		render(Sidebar, { tree: flatTree, currentSlug: 'about' });

		const fileBtn = screen.getByText('contact.md').closest('button')!;
		expect(fileBtn.classList.contains('active')).toBe(false);
	});

	it('highlights no file when currentSlug is empty string', () => {
		render(Sidebar, { tree: flatTree, currentSlug: '' });

		const aboutBtn = screen.getByText('about.md').closest('button')!;
		expect(aboutBtn.classList.contains('active')).toBe(false);
	});

	it('highlights no file when currentSlug is null', () => {
		render(Sidebar, { tree: flatTree, currentSlug: null });

		const aboutBtn = screen.getByText('about.md').closest('button')!;
		expect(aboutBtn.classList.contains('active')).toBe(false);
	});

	// =========== Cas limites ===========

	it('defaults to content view when sidebarView is not provided', () => {
		render(Sidebar, { tree: flatTree });
		expect(screen.getByText('about.md')).toBeTruthy();
		expect(screen.getByText('contact.md')).toBeTruthy();
	});

	it('renders multiple directories in the tree', () => {
		const multiDirTree = [
			{ type: 'directory' as const, name: 'blog', slug: 'blog', path: 'blog', children: [] },
			{ type: 'directory' as const, name: 'projects', slug: 'projects', path: 'projects', children: [] },
		];
		render(Sidebar, { tree: multiDirTree, currentSlug: '', onLoadFile: vi.fn() });
		expect(screen.getByText('blog')).toBeTruthy();
		expect(screen.getByText('projects')).toBeTruthy();
	});

	it('shows collapse icon when expandedSlugs contains the directory', () => {
		render(Sidebar, { tree: treeWithDir, expandedSlugs: new Set(['blog']), currentSlug: '', onLoadFile: vi.fn() });
		const dirBtn = screen.getByText('blog').closest('button')!;
		expect(dirBtn.getAttribute('title')).toBe('Réduire');
	});

	it('shows expand icon when expandedSlugs does not contain the directory', () => {
		render(Sidebar, { tree: treeWithDir, expandedSlugs: new Set<string>(), currentSlug: '', onLoadFile: vi.fn() });
		const dirBtn = screen.getByText('blog').closest('button')!;
		expect(dirBtn.getAttribute('title')).toBe('Développer');
	});

	it('calls onToggleFolder when directory is clicked', async () => {
		const onToggleFolder = vi.fn();
		const { expandedSlugs, handleToggle } = makeExpandable(onToggleFolder);
		render(Sidebar, {
			tree: treeWithDir,
			expandedSlugs,
			onToggleFolder: handleToggle,
			currentSlug: '',
			onLoadFile: vi.fn(),
		});

		const dirBtn = screen.getByText('blog').closest('button')!;
		await fireEvent.click(dirBtn);
		expect(onToggleFolder).toHaveBeenCalledWith('blog');
	});
});
