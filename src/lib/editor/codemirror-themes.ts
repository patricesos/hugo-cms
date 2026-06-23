import { githubLight } from '@fsegurai/codemirror-theme-github-light';
import { githubDark } from '@fsegurai/codemirror-theme-github-dark';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

/**
 * Surcharges communes aux deux thèmes (clair + sombre).
 * Utilise les variables CSS --c-* qui s'adaptent automatiquement.
 */
const themeOverrides: Extension = EditorView.theme({
	'.cm-gutters': {
		backgroundColor: 'var(--c-bg-subtle)',
		color: 'var(--c-text-muted)',
		borderRight: '1px solid var(--c-border)',
		fontFamily: 'var(--font-mono)',
	},
	'.cm-activeLineGutter': { backgroundColor: 'var(--c-bg-muted)' },
	'.cm-cursor': { borderLeftColor: 'var(--c-text)' },
	'.cm-selectionBackground': { backgroundColor: 'var(--c-primary-light)' },
	'&.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--c-primary-light)' },
	'.cm-activeLine': { backgroundColor: 'var(--c-bg-muted)' },
	'.cm-selectionMatch': { backgroundColor: 'var(--c-bg-muted)' },
	'.cm-foldPlaceholder': { backgroundColor: 'transparent' },
	'.cm-header-1': { color: 'var(--c-danger)' },
	'.cm-header-2': { color: 'var(--c-warning)' },
	'.cm-header-3': { color: 'var(--c-primary)' },
	'.cm-header-4': { color: 'var(--c-success)' },
	'.cm-header-5': { color: 'var(--c-renamed)' },
	'.cm-header-6': { color: 'var(--c-text-muted)' },
	'.cm-header-1, .cm-header-2, .cm-header-3, .cm-header-4, .cm-header-5, .cm-header-6': {
		fontWeight: 600,
		lineHeight: 1.4,
	},
});

/**
 * Retourne l'extension de thème CM6 adaptée au mode.
 */
export function getCmTheme(isDark: boolean): Extension {
	return isDark ? [githubDark, themeOverrides] : [githubLight, themeOverrides];
}
