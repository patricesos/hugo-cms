import { get } from 'svelte/store';
import { editorStore } from '$lib/stores/editor.svelte';

let conflictPollTimer: ReturnType<typeof setInterval> | null = null;

export function stopConflictPoll() {
	if (conflictPollTimer) {
		clearInterval(conflictPollTimer);
		conflictPollTimer = null;
	}
}

async function checkExternalChanges(slug: string) {
	if (!slug || get(editorStore.saveState) === 'unsaved') return;
	const tab = get(editorStore.tabs).find(t => t.slug === slug);
	if (!tab || tab.kind !== 'content') return;
	try {
		const res = await fetch(`/api/content/${slug}`);
		if (!res.ok) return;
		const data = await res.json();
		const serverMtime: number = data.mtimeMs;
		if (Math.abs(serverMtime - tab.mtimeMs) > 1) {
			editorStore.conflictSlug.set(slug);
			editorStore.conflictServerMtimeMs.set(serverMtime);
		}
	} catch { /* ignore */ }
}

export function startConflictPoll(slug: string, pollInterval: number) {
	stopConflictPoll();
	if (!slug) return;
	conflictPollTimer = setInterval(() => checkExternalChanges(slug), pollInterval);
}

export function resolveConflict(action: 'reload' | 'overwrite') {
	const slug = get(editorStore.conflictSlug);
	if (!slug) return;
	const tab = get(editorStore.tabs).find(t => t.slug === slug);
	if (!tab) { editorStore.conflictSlug.set(null); return; }
	if (action === 'reload') {
		editorStore.reloadFileFromDisk(tab);
	}
	editorStore.conflictSlug.set(null);
}

export function handleVisibilityChange() {
	if (document.visibilityState === 'visible') {
		const slug = get(editorStore.currentSlug);
		if (slug) checkExternalChanges(slug);
	}
}
