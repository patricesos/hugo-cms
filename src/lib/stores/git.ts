import { writable, get } from 'svelte/store';

export interface GitStatus {
	branch: string;
	modified: string[];
	added: string[];
	deleted: string[];
	renamed: string[];
	staged: string[];
	untracked: string[];
	ahead: number;
	behind: number;
}

function create() {
	const status = writable<GitStatus | null>(null);
	const loading = writable(false);
	const initialized = writable(false);

	return {
		status,
		loading,
		initialized,

		async refresh() {
			loading.set(true);
			try {
				const res = await fetch('/api/git/status');
				if (res.ok) {
					status.set(await res.json());
				} else {
					status.set(null);
				}
			} catch {
				status.set(null);
			}
			loading.set(false);
		},

		async init() {
			await fetch('/api/git/init', { method: 'POST' });
			initialized.set(true);
			await this.refresh();
		},

		async commit(message: string, files: string[]) {
			const res = await fetch('/api/git/commit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message, files }),
			});
			if (res.ok) await this.refresh();
		},

		async push() {
			await fetch('/api/git/push', { method: 'POST' });
			await this.refresh();
		},

		ensureInitialized() {
			if (!get(initialized)) {
				initialized.set(true);
				this.refresh();
			}
		},

		snapshot() {
			return { status: get(status), loading: get(loading), initialized: get(initialized) };
		},
	};
}

export const gitStore = create();
