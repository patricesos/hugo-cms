import { writable, derived, get } from 'svelte/store';

export type HugoStatusType = 'loading' | 'running' | 'stopped' | 'error';

export interface HugoState {
	status: HugoStatusType;
	url: string | null;
	live: boolean;
	togglingLive: boolean;
	previewReloadKey: number;
}

function create() {
	const { subscribe, update } = writable<HugoState>({
		status: 'stopped',
		url: null,
		live: false,
		togglingLive: false,
		previewReloadKey: 0,
	});

	return {
		subscribe,

		async start() {
			update(s => ({ ...s, status: 'loading' }));
			try {
				const res = await fetch('/api/hugo/start', { method: 'POST' });
				const data = await res.json();
				if (data.running && data.url) {
					update(s => ({ ...s, status: 'running', url: data.url, live: data.live ?? s.live, previewReloadKey: s.previewReloadKey + 1 }));
				} else {
					update(s => ({ ...s, status: 'error' }));
				}
			} catch {
				update(s => ({ ...s, status: 'error' }));
			}
		},

		async stop() {
			try {
				const res = await fetch('/api/hugo/stop', { method: 'POST' });
				const data = await res.json();
				update(s => ({ ...s, live: data.live ?? s.live }));
			} catch { /* ignore */ }
			update(s => ({ ...s, status: 'stopped', url: null }));
		},

		async check() {
			try {
				const res = await fetch('/api/hugo/status');
				const data = await res.json();
				if (data.running && data.url) {
					update(s => ({ ...s, status: 'running', url: data.url, live: data.live ?? s.live }));
				} else {
					update(s => ({ ...s, status: 'stopped', url: null, live: data.live ?? s.live }));
				}
			} catch { /* ignore */ }
		},

		async toggleLive() {
			update(s => ({ ...s, togglingLive: true }));
			try {
				const currentLive = get(hugoStore).live;
				const newBind = currentLive ? '127.0.0.1' : '0.0.0.0';
				const res = await fetch('/api/hugo/bind', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ bindAddress: newBind }),
				});
				const data = await res.json();
				if (data.running && data.url) {
					update(s => ({ ...s, live: data.live ?? false, status: 'running', url: data.url, previewReloadKey: s.previewReloadKey + 1 }));
				} else {
					update(s => ({
						...s,
						live: data.live ?? false,
						status: data.error ? 'error' : 'stopped',
						url: data.running ? data.url : null,
					}));
				}
			} catch {
				update(s => ({ ...s, status: 'error' }));
			} finally {
				update(s => ({ ...s, togglingLive: false }));
			}
		},

		reloadPreview() {
			update(s => ({ ...s, previewReloadKey: s.previewReloadKey + 1 }));
		},

		openPreviewInTab() {
			const snap = get(hugoStore);
			if (snap.url) window.open(snap.url, '_blank');
		},

		snapshot(): HugoState {
			return get(hugoStore);
		},
	};
}

export const hugoStore = create();

export const hugoStatus = derived(hugoStore, s => s.status);
export const hugoUrl = derived(hugoStore, s => s.url);
export const hugoLive = derived(hugoStore, s => s.live);
export const hugoTogglingLive = derived(hugoStore, s => s.togglingLive);
export const previewReloadKey = derived(hugoStore, s => s.previewReloadKey);
