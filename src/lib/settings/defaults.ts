/**
 * Valeurs par défaut partagées entre le serveur (user-config.ts)
 * et le client (settings.svelte.ts).
 * Ce fichier ne doit JAMAIS importer de module $lib/server/.
 * Les types unions sont redefinis ici pour eviter la fuite Node.js.
 */
type _Theme = 'light' | 'dark' | 'system';
type _EditorFont = 'sans' | 'mono' | 'serif' | 'system-ui';
type _EditorFontSize = 'small' | 'normal' | 'large';
type _EditorMaxWidth = '720px' | '100%' | 'custom';

// Interface partielle : champs communs aux deux cotes
export interface DefaultSettings {
	defaultRawMode: boolean;
	showBubbleMenu: boolean;
	showSlashMenu: boolean;
	draftByDefault: boolean;
	autoSaveDelay: number;
	theme: _Theme;
	editorFont: _EditorFont;
	editorFontSize: _EditorFontSize;
	editorMaxWidth: _EditorMaxWidth;
	editorMaxWidthCustom: number;
	historyDepth: number;
	showFilenameInTabs: boolean;
	gitRemote: string;
	gitBranch: string;
	hugoSitePathUseDotEnv: boolean;
	hugoSitePathCustom: string;
	hugoBindAddress: string;
	hugoPort: number;
	cmsBindAddress: string;
	cmsPort: number;
	trashDir: string;
}

export const SETTINGS_DEFAULTS: DefaultSettings = {
	defaultRawMode: false,
	showBubbleMenu: true,
	showSlashMenu: true,
	draftByDefault: true,
	autoSaveDelay: 2000,
	theme: 'system',
	editorFont: 'serif',
	editorFontSize: 'normal',
	editorMaxWidth: '720px',
	editorMaxWidthCustom: 720,
	historyDepth: 250,
	showFilenameInTabs: false,
	gitRemote: 'origin',
	gitBranch: 'main',
	hugoSitePathUseDotEnv: true,
	hugoSitePathCustom: '',
	hugoBindAddress: '127.0.0.1',
	hugoPort: 1313,
	cmsBindAddress: '127.0.0.1',
	cmsPort: 1703,
	trashDir: '_trash',
};
