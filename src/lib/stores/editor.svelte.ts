import { writable, derived, get } from 'svelte/store';
import type { TreeNode } from '$lib/server/types';

export type TabKind = 'content' | 'static' | 'archetype' | 'config';

export interface Tab {
	slug: string;
	title: string;
	content: string;
	frontmatter: Record<string, unknown>;
	mtimeMs: number;
	frontmatterLanguage?: 'yaml' | 'toml';
	kind: TabKind;
}

function create() {
	const tabs = writable<Tab[]>([]);
	const currentSlug = writable<string | null>(null);
	const editorContent = writable('');
	const currentFrontmatter = writable<Record<string, unknown>>({});
	const currentFmFormat = writable<'yaml' | 'toml'>('yaml');
	const wordCount = writable(0);
	const charCount = writable(0);
	const saveState = writable<'saved' | 'unsaved' | 'saving'>('saved');
	const saveRequest = writable(0);
	const loading = writable(false);
	const currentArchetype = writable<string | null>(null);
	const currentConfigSlug = writable<string | null>(null);
	const conflictSlug = writable<string | null>(null);
	const conflictServerMtimeMs = writable(0);

	/** Callbacks pour communiquer avec l'éditeur (instance CodeMirror). */
	let _editorGetContent: (() => string) | null = null;
	let _editorSetContent: ((content: string) => void) | null = null;

	return {
		tabs,
		currentSlug,
		editorContent,
		currentFrontmatter,
		currentFmFormat,
		wordCount,
		charCount,
		saveState,
		saveRequest,
		loading,
		currentArchetype,
		currentConfigSlug,
		conflictSlug,
		conflictServerMtimeMs,

		currentTab: derived(currentSlug, ($slug, set) => {
			const unsub = tabs.subscribe($tabs => {
				set($tabs.find(t => t.slug === $slug));
			});
			return unsub;
		}),

		setEditorGetContent(fn: (() => string) | null) { _editorGetContent = fn; },
		setEditorSetContent(fn: ((content: string) => void) | null) { _editorSetContent = fn; },

		flattenTree(nodes: TreeNode[]): TreeNode[] {
			const result: TreeNode[] = [];
			for (const n of nodes) {
				if (n.type === 'file') result.push(n);
				if (n.children) result.push(...flattenTree(n.children));
			}
			return result;
		},

		updateTreeFrontmatter(tree: TreeNode[], slug: string, fm: Record<string, unknown>): TreeNode[] {
			function walk(nodes: TreeNode[]): boolean {
				for (const n of nodes) {
					if (n.slug === slug) { n.frontmatter = fm; return true; }
					if (n.children && walk(n.children)) return true;
				}
				return false;
			}
			walk(tree);
			return tree.map(n => ({ ...n }));
		},

		async loadFile(slug: string, loadTreeFn: () => Promise<void>) {
			const $tabs = get(tabs);
			const existing = $tabs.find(t => t.slug === slug);
			if (existing) {
				await this.switchToTab(slug);
				return;
			}
			loading.set(true);
			const res = await fetch(`/api/content/${slug}`);
			const data = await res.json();
			const tab: Tab = {
				slug,
				title: (data.frontmatter?.title as string) || slug.split('/').pop() || '',
				content: data.body || '',
				frontmatter: (data.frontmatter as Record<string, unknown>) || {},
				mtimeMs: data.mtimeMs ?? 0,
				frontmatterLanguage: data.frontmatterLanguage ?? 'yaml',
				kind: 'content',
			};
			tabs.update(t => [...t, tab]);
			await this.switchToTab(slug);
			loading.set(false);
		},

		async switchToTab(slug: string) {
			const $tabs = get(tabs);
			const tab = $tabs.find(t => t.slug === slug);
			if (!tab) return;
			if (tab.kind === 'content') {
				if (_editorGetContent) {
					const $currentSlug = get(currentSlug);
					const current = $tabs.find(t => t.slug === $currentSlug);
					if (current && current.kind === 'content') {
						current.content = _editorGetContent();
						current.frontmatter = { ...get(currentFrontmatter) };
					}
				}
				currentSlug.set(tab.slug);
				editorContent.set(tab.content);
				currentFrontmatter.set({ ...tab.frontmatter });
				currentFmFormat.set(tab.frontmatterLanguage ?? 'yaml');
				_editorSetContent?.(tab.content);
			} else if (tab.kind === 'archetype') {
				currentArchetype.set(tab.slug);
			} else if (tab.kind === 'config') {
				currentConfigSlug.set(tab.slug);
			}
			currentSlug.set(tab.slug);
		},

		async handleSave(markdown: string) {
			const $slug = get(currentSlug);
			if (!$slug) return;
			const $tabs = get(tabs);
			const tab = $tabs.find(t => t.slug === $slug);
			if (!tab) return;
			const expectedMtimeMs = tab.mtimeMs;
			tab.content = markdown;
			tab.frontmatter = { ...get(currentFrontmatter) };
			const res = await fetch(`/api/content/${$slug}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: markdown, frontmatter: get(currentFrontmatter), expectedMtimeMs, frontmatterLanguage: tab.frontmatterLanguage ?? 'yaml' }),
			});
			if (res.status === 409) {
				const { serverMtimeMs } = await res.json();
				conflictSlug.set($slug);
				conflictServerMtimeMs.set(serverMtimeMs);
				return;
			}
			if (res.ok) {
				const data = await res.json();
				tab.mtimeMs = data.mtimeMs ?? tab.mtimeMs;
			}
		},

		handleCloseTab(slug: string) {
			const $tabs = get(tabs);
			const idx = $tabs.findIndex(t => t.slug === slug);
			if (idx === -1) return;
			tabs.set($tabs.filter(t => t.slug !== slug));
			const $ca = get(currentArchetype);
			const $ccs = get(currentConfigSlug);
			if ($ca === slug) currentArchetype.set(null);
			if ($ccs === slug) currentConfigSlug.set(null);
			if (get(currentSlug) === slug) {
				const $newTabs = get(tabs);
				const nextTab = $newTabs[Math.min(idx, $newTabs.length - 1)];
				if (nextTab) {
					currentSlug.set(nextTab.slug);
					if (nextTab.kind === 'content') {
						editorContent.set(nextTab.content);
						currentFrontmatter.set({ ...nextTab.frontmatter });
						_editorSetContent?.(nextTab.content);
					}
				} else {
					currentSlug.set(null);
					editorContent.set('');
					currentFrontmatter.set({});
				}
			}
		},

		async handleCreate(title: string, section: string, loadTreeFn: () => Promise<void>, archetype?: string) {
			const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
			const fullSlug = section ? `${section}/${slug}` : slug;
			const frontmatter: Record<string, unknown> = { title, date: new Date().toISOString().split('T')[0] };
			await fetch(`/api/content/${fullSlug}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: '', frontmatter, archetype: archetype || 'default' }),
			});
			await loadTreeFn();
			await this.loadFile(fullSlug, loadTreeFn);
		},

		async handleDelete(slug: string | undefined, trashDir: string, loadTreeFn: () => Promise<void>) {
			const target = slug || get(currentSlug);
			if (!target) return;
			if (!window.confirm(`Supprimer "${target}" ?\n\nLe fichier sera déplacé dans ${trashDir}/.`)) return;
			await fetch(`/api/content/${target}`, { method: 'DELETE' });
			tabs.update(t => t.filter(tab => tab.slug !== target));
			if (slug || get(currentSlug) === target) {
				const $tabs = get(tabs);
				currentSlug.set($tabs.length > 0 ? $tabs[$tabs.length - 1].slug : null);
				const $newSlug = get(currentSlug);
				if ($newSlug) {
					const tab = $tabs.find(t => t.slug === $newSlug)!;
					editorContent.set(tab.content);
					currentFrontmatter.set({ ...tab.frontmatter });
				} else {
					editorContent.set('');
					currentFrontmatter.set({});
				}
			}
			await loadTreeFn();
		},

		async handleDeleteFolder(slug: string, trashDir: string, loadTreeFn: () => Promise<void>) {
			if (!window.confirm(`Supprimer le dossier "${slug}" ?\n\nTout son contenu sera déplacé dans ${trashDir}/.`)) return;
			await fetch(`/api/directory/${slug}`, { method: 'DELETE' });
			tabs.update(t => t.filter(tab => tab.slug !== slug && !tab.slug.startsWith(slug + '/')));
			const $tabs = get(tabs);
			if ($tabs.length === 0) {
				currentSlug.set(null);
				editorContent.set('');
			} else if (!$tabs.find(t => t.slug === get(currentSlug))) {
				currentSlug.set($tabs[$tabs.length - 1].slug);
				const tab = $tabs.find(t => t.slug === get(currentSlug))!;
				editorContent.set(tab.content);
			}
			await loadTreeFn();
		},

		async handleCreateFolder(folderName: string, parent: string, loadTreeFn: () => Promise<void>) {
			const fullSlug = parent ? `${parent}/${folderName}` : folderName;
			await fetch(`/api/directory/${fullSlug}`, { method: 'POST' });
			await loadTreeFn();
		},

		async handleRename(oldSlug: string, newSlug: string, loadTreeFn: () => Promise<void>) {
			const res = await fetch(`/api/content/${oldSlug}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newSlug }),
			});
			if (!res.ok) return;
			tabs.update(t => t.map(tab => tab.slug === oldSlug ? { ...tab, slug: newSlug, title: newSlug.split('/').pop() || newSlug } : tab));
			if (get(currentSlug) === oldSlug) currentSlug.set(newSlug);
			await loadTreeFn();
		},

		async handleDuplicate(slug: string, tree: TreeNode[], loadTreeFn: () => Promise<void>) {
			let content: string;
			let frontmatter: Record<string, unknown>;
			const $tabs = get(tabs);
			const existingTab = $tabs.find(t => t.slug === slug);
			if (existingTab) {
				content = existingTab.content;
				frontmatter = { ...existingTab.frontmatter };
			} else {
				const res = await fetch(`/api/content/${slug}`);
				const data = await res.json();
				content = data.body || '';
				frontmatter = (data.frontmatter as Record<string, unknown>) || {};
			}
			const allSlugs = new Set([...$tabs.map(t => t.slug), ...flattenTree(tree).map(n => n.slug)]);
			const baseSlug = slug.replace(/\.md$/, '') + '-copy';
			let newSlug = baseSlug;
			let counter = 0;
			while (allSlugs.has(newSlug)) { counter++; newSlug = `${baseSlug}-${counter + 1}`; }
			const newTitle = (frontmatter.title as string) ? `${frontmatter.title} (copie)` : slug.split('/').pop() || '';
			const newFrontmatter = { ...frontmatter, title: newTitle, date: new Date().toISOString().split('T')[0] };
			await fetch(`/api/content/${newSlug}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: content, frontmatter: newFrontmatter }),
			});
			await loadTreeFn();
			await this.loadFile(newSlug, loadTreeFn);
		},

		async reloadFileFromDisk(tab: Tab) {
			try {
				const res = await fetch(`/api/content/${tab.slug}`);
				const data = await res.json();
				tab.content = data.body || '';
				tab.frontmatter = (data.frontmatter as Record<string, unknown>) || {};
				tab.mtimeMs = data.mtimeMs;
				tab.frontmatterLanguage = data.frontmatterLanguage ?? 'yaml';
				tab.title = (data.frontmatter?.title as string) || tab.slug.split('/').pop() || '';
				if (get(currentSlug) === tab.slug) {
					editorContent.set(tab.content);
					currentFrontmatter.set({ ...tab.frontmatter });
					currentFmFormat.set(tab.frontmatterLanguage ?? 'yaml');
					_editorSetContent?.(tab.content);
				}
			} catch { /* ignore */ }
		},
	};
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
	const result: TreeNode[] = [];
	for (const n of nodes) {
		if (n.type === 'file') result.push(n);
		if (n.children) result.push(...flattenTree(n.children));
	}
	return result;
}

export const editorStore = create();
