import { writable } from 'svelte/store';

interface ConfirmState {
	show: boolean;
	title: string;
	message: string;
	resolve: ((value: boolean) => void) | null;
}

function createConfirmStore() {
	const store = writable<ConfirmState>({
		show: false,
		title: '',
		message: '',
		resolve: null,
	});

	function confirm(title: string, message: string): Promise<boolean> {
		return new Promise((resolve) => {
			store.set({ show: true, title, message, resolve });
		});
	}

	function resolve(value: boolean) {
		store.update((s) => {
			if (s.resolve) s.resolve(value);
			return { show: false, title: '', message: '', resolve: null };
		});
	}

	return {
		subscribe: store.subscribe,
		confirm,
		resolve,
	};
}

export const confirmStore = createConfirmStore();
