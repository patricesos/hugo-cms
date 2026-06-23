import { writable, derived, get } from 'svelte/store';
import type { TreeNode } from '$lib/server/types';
import { flattenTree } from '$lib/tree-utils';
import { settingsStore } from '$lib/stores/settings.svelte';

export type TabKind = 'content' | 'static' | 'archetype' | 'config';

export interface Tab {
	slug: string;
	title: string;
	content: string;
	frontmatter: Record<string, unknown>;
	mtimeMs: number;
	frontmatterLanguage?: 'yaml' | 'toml';
	kind: TabKind;
	rawMode?: boolean;
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
	const configReloadKey = writable(0);
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
		configReloadKey,
		conflictSlug,
		conflictServerMtimeMs,

		currentTab: derived([currentSlug, tabs], ([$slug, $tabs]) =>
			$tabs.find(t => t.slug === $slug)
		),

		setEditorGetContent(fn: (() => string) | null) { _editorGetContent = fn; },
		setEditorSetContent(fn: ((content: string) => void) | null) { _editorSetContent = fn; },

		handleFrontmatterChange(fm: Record<string, unknown>) {
			currentFrontmatter.set(fm);
			saveState.set('unsaved');
			const slug = get(currentSlug);
			if (slug) {
				tabs.update(t => t.map(ti => ti.slug === slug ? { ...ti, frontmatter: fm } : ti));
			}
		},

		flattenTree,

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
			const curTabs = get(tabs);
			const existing = curTabs.find(t => t.slug === slug);
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

		/** Crée un onglet de type non-content s'il n'existe pas déjà.
		 *  N'appelle PAS switchToTab — l'appelant décide du moment du switch.
		 *  switchToTab synchronise aussi sidebarView automatiquement. */
		openKindTab(slug: string, kind: TabKind) {
			const curTabs = get(tabs);
			if (curTabs.some(t => t.slug === slug)) return;
			tabs.set([...curTabs, {
				slug,
				title: slug.split('/').pop() || slug,
				content: '',
				frontmatter: {},
				mtimeMs: 0,
				kind,
			} as Tab]);
		},

		async switchToTab(slug: string) {
			const curTabs = get(tabs);
			const tab = curTabs.find(t => t.slug === slug);
			if (!tab) return;
			if (tab.kind === 'content') {
				if (_editorGetContent) {
					const curSlug = get(currentSlug);
					const savedContent = _editorGetContent();
					const savedFm = { ...get(currentFrontmatter) };
					tabs.update(t => t.map(ti =>
						ti.slug === curSlug && ti.kind === 'content'
							? { ...ti, content: savedContent, frontmatter: savedFm }
							: ti
					));
				}
			currentSlug.set(tab.slug);
			editorContent.set(tab.content);
			currentFrontmatter.set({ ...tab.frontmatter });
			currentFmFormat.set(tab.frontmatterLanguage ?? 'yaml');
		} else if (tab.kind === 'archetype') {
			currentArchetype.set(tab.slug);
			currentSlug.set(tab.slug);
		} else if (tab.kind === 'config') {
			currentConfigSlug.set(tab.slug);
		currentSlug.set(tab.slug);
			} else {
				currentSlug.set(tab.slug);
			}
			const curView = settingsStore.snapshot().layout.sidebarView;
			if (curView !== 'all' && curView !== 'site') {
				let v: 'content' | 'static' | 'archetypes' | 'config' = 'content';
				if (tab.kind === 'archetype') v = 'archetypes';
				else if (tab.kind === 'config') v = 'config';
				else if (tab.kind === 'static') v = 'static';
				settingsStore.updateLayout({ sidebarView: v });
			}
		},

		async handleSave(markdown: string) {
			const curSlug = get(currentSlug);
			if (!curSlug) return;
			const curTabs = get(tabs);
			const tab = curTabs.find(t => t.slug === curSlug);
			if (!tab) return;
			const expectedMtimeMs = tab.mtimeMs;
			const fm = { ...get(currentFrontmatter) };
			const res = await fetch(`/api/content/${curSlug}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: markdown, frontmatter: fm, expectedMtimeMs, frontmatterLanguage: tab.frontmatterLanguage ?? 'yaml' }),
			});
			if (res.status === 409) {
				const { serverMtimeMs } = await res.json();
				conflictSlug.set(curSlug);
				conflictServerMtimeMs.set(serverMtimeMs);
				tabs.update(t => t.map(ti => ti.slug === curSlug ? { ...ti, content: markdown, frontmatter: fm } : ti));
				return;
			}
			if (res.ok) {
				const data = await res.json();
				tabs.update(t => t.map(ti => ti.slug === curSlug ? { ...ti, content: markdown, frontmatter: fm, mtimeMs: data.mtimeMs ?? ti.mtimeMs } : ti));
			}
		},

		handleCloseTab(slug: string) {
			const curTabs = get(tabs);
			const idx = curTabs.findIndex(t => t.slug === slug);
			if (idx === -1) return;
			tabs.set(curTabs.filter(t => t.slug !== slug));
			if (get(currentSlug) === slug) {
				const newTabs = get(tabs);
				const nextTab = newTabs[Math.min(idx, newTabs.length - 1)];
				if (nextTab) {
					currentSlug.set(nextTab.slug);
					if (nextTab.kind === 'content') {
						editorContent.set(nextTab.content);
						currentFrontmatter.set({ ...nextTab.frontmatter });
					} else {
						editorContent.set('');
						currentFrontmatter.set({});
					}
					currentConfigSlug.set(nextTab.kind === 'config' ? nextTab.slug : null);
					currentArchetype.set(nextTab.kind === 'archetype' ? nextTab.slug : null);
				} else {
					currentSlug.set(null);
					editorContent.set('');
					currentFrontmatter.set({});
					currentConfigSlug.set(null);
					currentArchetype.set(null);
				}
			} else {
				if (get(currentArchetype) === slug) currentArchetype.set(null);
				if (get(currentConfigSlug) === slug) currentConfigSlug.set(null);
			}
		},

		async handleCreate(title: string, section: string, loadTreeFn: () => Promise<void>, draftByDefault: boolean, archetype?: string) {
			const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
			const fullSlug = section ? `${section}/${slug}` : slug;
			const frontmatter: Record<string, unknown> = { title, date: new Date().toISOString().split('T')[0] };
			if (draftByDefault) frontmatter.draft = true;
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
				const curTabs = get(tabs);
				currentSlug.set(curTabs.length > 0 ? curTabs[curTabs.length - 1].slug : null);
				const newSlug = get(currentSlug);
				if (newSlug) {
					const tab = curTabs.find(t => t.slug === newSlug)!;
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
			const curTabs = get(tabs);
			if (curTabs.length === 0) {
				currentSlug.set(null);
				editorContent.set('');
			} else if (!curTabs.find(t => t.slug === get(currentSlug))) {
				currentSlug.set(curTabs[curTabs.length - 1].slug);
				const tab = curTabs.find(t => t.slug === get(currentSlug))!;
				editorContent.set(tab.content);
			}
			await loadTreeFn();
		},

		async handleCreateFolder(folderName: string, parent: string, loadTreeFn: () => Promise<void>) {
			const fullSlug = parent ? `${parent}/${folderName}` : folderName;
			await fetch(`/api/directory/${fullSlug}`, { method: 'POST' });
			await loadTreeFn();
		},

		updateTabRawMode(slug: string, rawMode: boolean) {
			tabs.update(t => t.map(ti => ti.slug === slug ? { ...ti, rawMode } : ti));
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
			const curTabs = get(tabs);
			const existingTab = curTabs.find(t => t.slug === slug);
			if (existingTab) {
				content = existingTab.content;
				frontmatter = { ...existingTab.frontmatter };
			} else {
				const res = await fetch(`/api/content/${slug}`);
				const data = await res.json();
				content = data.body || '';
				frontmatter = (data.frontmatter as Record<string, unknown>) || {};
			}
			const allSlugs = new Set([...curTabs.map(t => t.slug), ...flattenTree(tree).map(n => n.slug)]);
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
				const slug = tab.slug;
				const res = await fetch(`/api/content/${slug}`);
				const data = await res.json();
				const body = data.body || '';
				const frontmatter = (data.frontmatter as Record<string, unknown>) || {};
				const mtimeMs = data.mtimeMs;
				const frontmatterLanguage = data.frontmatterLanguage ?? 'yaml';
				const title = (data.frontmatter?.title as string) || slug.split('/').pop() || '';
				tabs.update(t => t.map(ti => ti.slug === slug ? {
					...ti, content: body, frontmatter, mtimeMs, frontmatterLanguage, title,
				} : ti));
				if (get(currentSlug) === slug) {
					editorContent.set(body);
					currentFrontmatter.set({ ...frontmatter });
					currentFmFormat.set(frontmatterLanguage);
				}
			} catch { /* ignore */ }
		},

		snapshot() {
			return {
				tabs: get(tabs),
				currentSlug: get(currentSlug),
				editorContent: get(editorContent),
				currentFrontmatter: get(currentFrontmatter),
				currentFmFormat: get(currentFmFormat),
				wordCount: get(wordCount),
				charCount: get(charCount),
				saveState: get(saveState),
				saveRequest: get(saveRequest),
				loading: get(loading),
				currentArchetype: get(currentArchetype),
				currentConfigSlug: get(currentConfigSlug),
				conflictSlug: get(conflictSlug),
				conflictServerMtimeMs: get(conflictServerMtimeMs),
				currentTab: get(tabs).find(t => t.slug === get(currentSlug)) ?? null,
			};
		},
	};
}

export const editorStore = create();
