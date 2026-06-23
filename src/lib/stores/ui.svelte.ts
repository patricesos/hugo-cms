import { writable, get } from 'svelte/store';

export interface DialogState {
	showCreateDialog: boolean;
	createFileSection: string;
	showCreateFolderDialog: boolean;
	createFolderParent: string;
	createFolderIsSite: boolean;
	showSearch: boolean;
	showShortcuts: boolean;
	showCommitDialog: boolean;
	showSitemap: boolean;
	showSettings: boolean;
	showRestartBanner: boolean;
	showNewSiteDialog: boolean;
	showThemeSelector: boolean;
}

function createUiStore() {
	const dialogs = writable<DialogState>({
		showCreateDialog: false,
		createFileSection: '',
		showCreateFolderDialog: false,
		createFolderParent: '',
		createFolderIsSite: false,
		showSearch: false,
		showShortcuts: false,
		showCommitDialog: false,
		showSitemap: false,
		showSettings: false,
		showRestartBanner: false,
		showNewSiteDialog: false,
		showThemeSelector: false,
	});

	return {
		dialogs,

		updateDialogs(partial: Partial<DialogState>) {
			dialogs.update(d => ({ ...d, ...partial }));
		},

		openCreateDialog(section: string = '') {
			dialogs.update(d => ({ ...d, showCreateDialog: true, createFileSection: section }));
		},

		closeCreateDialog() {
			dialogs.update(d => ({ ...d, showCreateDialog: false, createFileSection: '' }));
		},

		openCreateFolderDialog(parent: string = '') {
			dialogs.update(d => ({ ...d, showCreateFolderDialog: true, createFolderParent: parent }));
		},

		closeCreateFolderDialog() {
			dialogs.update(d => ({ ...d, showCreateFolderDialog: false, createFolderParent: '' }));
		},

		toggleSearch() {
			dialogs.update(d => ({ ...d, showSearch: !d.showSearch }));
		},

		toggleShortcuts() {
			dialogs.update(d => ({ ...d, showShortcuts: !d.showShortcuts }));
		},

		toggleSettings() {
			dialogs.update(d => ({ ...d, showSettings: !d.showSettings }));
		},

		toggleSitemap() {
			dialogs.update(d => ({ ...d, showSitemap: !d.showSitemap }));
		},

		toggleThemeSelector() {
			dialogs.update(d => ({ ...d, showThemeSelector: !d.showThemeSelector }));
		},

		snapshot() {
			return get(dialogs);
		},
	};
}

export const uiStore = createUiStore();
