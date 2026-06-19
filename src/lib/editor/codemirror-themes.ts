import { monokai } from '@fsegurai/codemirror-theme-monokai';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

/**
 * Thème clair pour CM6 en mode light.
 * Utilise les variables CSS du thème (--c-*) qui s'adaptent
 * automatiquement via `:root` / `[data-theme="dark"]`.
 */
export const cmLightTheme: Extension = EditorView.theme({
	'.cm-gutters': {
		backgroundColor: 'var(--c-bg-subtle)',
		color: 'var(--c-text-muted)',
		borderRight: '1px solid var(--c-border)',
	},
	'.cm-activeLineGutter': { backgroundColor: 'var(--c-bg-muted)' },
	'.cm-cursor': { borderLeftColor: 'var(--c-text)' },
	'.cm-selectionBackground': { backgroundColor: 'var(--c-primary-light)' },
	'&.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--c-primary-light)' },
	'.cm-activeLine': { backgroundColor: 'var(--c-bg-muted)' },
	'.cm-selectionMatch': { backgroundColor: 'var(--c-bg-muted)' },
	'.cm-foldPlaceholder': { backgroundColor: 'transparent' },
});

/**
 * Thème sombre pour CM6 en mode dark.
 */
export const cmDarkTheme: Extension = monokai;

/**
 * Retourne l'extension de thème CM6 adaptée au mode.
 */
export function getCmTheme(isDark: boolean): Extension {
	return isDark ? cmDarkTheme : cmLightTheme;
}
