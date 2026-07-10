import { editorStore } from '$lib/stores/editor';
import type { Tab as EditorTab } from '$lib/stores/editor';
import { gitStore } from '$lib/stores/git';
import { settingsStore } from '$lib/stores/settings';

export interface RestoreResult {
	activeSlug: string | null;
	shouldInitGit: boolean;
}

export async function restoreAppState(): Promise<RestoreResult> {
	const result = settingsStore.restoreFromLocalStorage();
	const shouldInitGit = result?.showGit ?? false;

	if (result?.tabs && result?.currentSlug) {
		const restored: EditorTab[] = result.tabs.map((t) => {
			const kind = (t.kind as EditorTab['kind']) ?? (t.isImage ? 'static' : 'content');
			return {
				slug: t.slug,
				title: t.title,
				content: '',
				frontmatter: {},
				mtimeMs: 0,
				frontmatterLanguage: (t.frontmatterLanguage ?? 'yaml') as 'yaml' | 'toml',
				kind,
				rawMode: t.rawMode ?? false,
			};
		});
		editorStore.tabs.set(restored);
		editorStore.currentSlug.set(result.currentSlug);

		const contentTabs = restored.filter(t => t.kind === 'content');
		await Promise.all(contentTabs.map(async (t) => {
			try {
				const res = await fetch(`/api/content/${t.slug}`);
				const data = await res.json();
				t.content = data.body || '';
				t.frontmatter = (data.frontmatter as Record<string, unknown>) || {};
				t.mtimeMs = data.mtimeMs ?? 0;
				t.frontmatterLanguage = data.frontmatterLanguage ?? 'yaml';
			} catch { /* ignore */ }
		}));

		const active = restored.find(t => t.slug === result.currentSlug);
		if (active && active.kind === 'content') {
			editorStore.editorContent.set(active.content);
			editorStore.currentFrontmatter.set({ ...active.frontmatter });
			editorStore.currentFmFormat.set(active.frontmatterLanguage ?? 'yaml');
		}

		await settingsStore.restoreFromFile();
		return { activeSlug: result.currentSlug, shouldInitGit };
	}

	if (shouldInitGit) {
		gitStore.initialized.set(true);
		await gitStore.refresh();
	}

	await settingsStore.restoreFromFile();
	return { activeSlug: null, shouldInitGit };
}
