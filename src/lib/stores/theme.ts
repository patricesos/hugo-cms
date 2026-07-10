import { writable, derived, get } from 'svelte/store';
import type { ThemeCatalogEntry } from '$lib/server/theme-catalog';
import { hugoStore } from './hugo';
import { editorStore } from './editor';

export interface ThemeStoreState {
	catalog: (ThemeCatalogEntry & { installed: boolean; active: boolean })[];
	loading: boolean;
	installing: string | null;
	installProgress: number;
	error: string | null;
}

function createThemeStore() {
	const store = writable<ThemeStoreState>({
		catalog: [],
		loading: false,
		installing: null,
		installProgress: 0,
		error: null,
	});

	async function fetchCatalog(): Promise<void> {
		store.update((s) => ({ ...s, loading: true, error: null }));
		try {
			const res = await fetch('/api/hugo/theme/list');
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Erreur lors du chargement du catalogue.');
			}
			const data = await res.json();
			store.update((s) => ({ ...s, catalog: data.themes, loading: false }));
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			store.update((s) => ({ ...s, loading: false, error: msg }));
		}
	}

	async function install(themeId: string): Promise<boolean> {
		store.update((s) => ({ ...s, installing: themeId, installProgress: 0, error: null }));

		let pollTimer: ReturnType<typeof setInterval> | undefined;
		const stopPolling = () => {
			if (pollTimer) { clearInterval(pollTimer); pollTimer = undefined; }
		};
		pollTimer = setInterval(async () => {
			try {
				const res = await fetch(`/api/hugo/theme/progress?themeId=${themeId}`);
				if (!res.ok) return;
				const data = await res.json();
				store.update((s) => ({ ...s, installProgress: data.progress ?? 0 }));
			} catch { /* ignore polling errors */ }
		}, 400);

		try {
			const res = await fetch('/api/hugo/theme/install', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ themeId }),
			});
			stopPolling();
			const data = await res.json();
			if (!res.ok) {
				store.update((s) => ({
					...s,
					installing: null,
					installProgress: 0,
					error: data.message || data.error || 'Échec de l\'installation.',
				}));
				return false;
			}
			store.update((s) => ({ ...s, installProgress: 100 }));
			await fetchCatalog();
			store.update((s) => ({ ...s, installing: null, installProgress: 0 }));
			hugoStore.reloadPreview();
			editorStore.configReloadKey.update(n => n + 1);
			return true;
		} catch (err) {
			stopPolling();
			const msg = err instanceof Error ? err.message : String(err);
			store.update((s) => ({ ...s, installing: null, installProgress: 0, error: msg }));
			return false;
		}
	}

	async function switchTheme(themeId: string): Promise<boolean> {
		store.update((s) => ({ ...s, error: null }));
		try {
			const res = await fetch('/api/hugo/theme/switch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ themeId }),
			});
			const data = await res.json();
			if (!res.ok) {
				store.update((s) => ({
					...s,
					error: data.message || data.error || 'Échec du changement de thème.',
				}));
				return false;
			}
			await fetchCatalog();
			hugoStore.reloadPreview();
			editorStore.configReloadKey.update(n => n + 1);
			return true;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			store.update((s) => ({ ...s, error: msg }));
			return false;
		}
	}

	async function uninstall(themeId: string): Promise<boolean> {
		store.update((s) => ({ ...s, error: null }));
		try {
			const res = await fetch('/api/hugo/theme/uninstall', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ themeId }),
			});
			const data = await res.json();
			if (!res.ok) {
				store.update((s) => ({
					...s,
					error: data.message || data.error || 'Échec de la désinstallation.',
				}));
				return false;
			}
			await fetchCatalog();
			hugoStore.reloadPreview();
			editorStore.configReloadKey.update(n => n + 1);
			return true;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			store.update((s) => ({ ...s, error: msg }));
			return false;
		}
	}

	function clearError(): void {
		store.update((s) => ({ ...s, error: null }));
	}

	return {
		subscribe: store.subscribe,

		// Sous-stores derived (Pattern B)
		catalog: derived(store, s => s.catalog),
		loading: derived(store, s => s.loading),
		installing: derived(store, s => s.installing),
		installProgress: derived(store, s => s.installProgress),
		error: derived(store, s => s.error),

		fetchCatalog,
		install,
		switchTheme,
		uninstall,
		clearError,

		snapshot(): ThemeStoreState {
			return get(store);
		},
	};
}

export const themeStore = createThemeStore();
