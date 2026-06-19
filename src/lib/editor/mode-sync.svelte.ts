import yaml from 'js-yaml';
import { parse, stringify } from '@iarna/toml';

// =============================================================================
// Flags de coordination internes — mode-sync n'exporte PAS de $state pour
// éviter les erreurs "Cannot assign to import" de Svelte 5.
// Editor.svelte garde rawContent comme $state local et reçoit des retours
// d'action depuis cette API.
// =============================================================================

// Flags de coordination internes
let contentUpdatedByEffect = false;
let prevFmSnapshot = '';

// =============================================================================
// Helpers de manipulation frontmatter
// =============================================================================

export function serializeFm(fm: Record<string, unknown>, format: 'yaml' | 'toml'): string {
	if (format === 'toml') {
		return `+++\n${stringify(fm as unknown as import('@iarna/toml').JsonMap)}+++`;
	}
	return `---\n${yaml.dump(fm, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }).trim()}\n---`;
}

export function splitRawContent(text: string): { frontmatter: Record<string, unknown> | null; body: string; format: 'yaml' | 'toml' } {
	const trimmed = text.trimStart();
	if (trimmed.startsWith('+++')) {
		const endIdx = trimmed.indexOf('+++', 3);
		if (endIdx === -1) return { frontmatter: null, body: text, format: 'toml' };
		const block = trimmed.slice(3, endIdx).trim();
		const rest = trimmed.slice(endIdx + 3).trimStart();
		if (!block) return { frontmatter: null, body: rest, format: 'toml' };
		try {
			const parsed = parse(block) as Record<string, unknown>;
			if (parsed && typeof parsed === 'object') {
				return { frontmatter: parsed, body: rest, format: 'toml' };
			}
		} catch { /* ignore */ }
		return { frontmatter: null, body: text, format: 'toml' };
	}
	if (trimmed.startsWith('---')) {
		const endIdx = trimmed.indexOf('---', 3);
		if (endIdx === -1) return { frontmatter: null, body: text, format: 'yaml' };
		const yamlBlock = trimmed.slice(3, endIdx).trim();
		const rest = trimmed.slice(endIdx + 3).trimStart();
		if (!yamlBlock) return { frontmatter: null, body: rest, format: 'yaml' };
		try {
			const parsed = yaml.load(yamlBlock);
			if (parsed && typeof parsed === 'object') {
				return { frontmatter: parsed as Record<string, unknown>, body: rest, format: 'yaml' };
			}
		} catch { /* ignore */ }
		return { frontmatter: null, body: text, format: 'yaml' };
	}
	return { frontmatter: null, body: text, format: 'yaml' };
}

export function getRawBody(text: string): string {
	const { frontmatter: _, body } = splitRawContent(text);
	return body;
}

// =============================================================================
// Types d'actions retournées par les fonctions de décision
// =============================================================================

export interface ContentAction {
	/** rawContent a changé — Editor.svelte doit assigner sa $state locale */
	newRawContent?: string;
	/** setContent sur Tiptap */
	setWysiwygContent?: string;
	/** build/rebuild Tiptap */
	buildEditor?: string;
}

// =============================================================================
// API publique — fonctions pures qui retournent des actions
// =============================================================================

export function resetAction(
	content: string,
	rawMode: boolean,
	frontmatter: Record<string, unknown>,
	frontmatterFormat: 'yaml' | 'toml',
): ContentAction {
	contentUpdatedByEffect = false;
	prevFmSnapshot = '';

	if (rawMode) {
		const fmString = (frontmatter && Object.keys(frontmatter).length > 0)
			? serializeFm(frontmatter, frontmatterFormat)
			: '';
		return { newRawContent: fmString ? `${fmString}\n\n${content}` : content };
	}
	return { newRawContent: '' };
}

export function handleContentChangeAction(
	newContent: string,
	rawMode: boolean,
	frontmatter: Record<string, unknown>,
	frontmatterFormat: 'yaml' | 'toml',
): ContentAction {
	contentUpdatedByEffect = true;

	if (rawMode) {
		const fmString = (frontmatter && Object.keys(frontmatter).length > 0)
			? serializeFm(frontmatter, frontmatterFormat)
			: '';
		const newRawContent = fmString ? `${fmString}\n\n${newContent}` : newContent;
		return { newRawContent };
	}
	return { setWysiwygContent: newContent };
}

/**
 * Version de handleRawModeChangeAction qui accepte rawContent en paramètre
 * pour le switch vers WYSIWYG (extraction du body depuis rawContent).
 */
export function handleRawModeChangeActionWithRaw(
	newRawMode: boolean,
	frontmatter: Record<string, unknown>,
	frontmatterFormat: 'yaml' | 'toml',
	currentContent: string,
	getMarkdown: () => string,
	rawContent: string,
): ContentAction {
	if (contentUpdatedByEffect) {
		contentUpdatedByEffect = false;
		return {};
	}
	if (newRawMode) {
		const body = getMarkdown() || currentContent;
		const fmString = (frontmatter && Object.keys(frontmatter).length > 0)
			? serializeFm(frontmatter, frontmatterFormat)
			: '';
		return { newRawContent: fmString ? `${fmString}\n\n${body}` : body };
	}
	return { buildEditor: getRawBody(rawContent) };
}

export function handleFrontmatterChangeAction(
	frontmatter: Record<string, unknown>,
	frontmatterFormat: 'yaml' | 'toml',
	rawContent: string,
): { newRawContent: string } | null {
	const snapshot = JSON.stringify(frontmatter) + '|' + frontmatterFormat;
	if (snapshot === prevFmSnapshot) return null;
	prevFmSnapshot = snapshot;

	const body = getRawBody(rawContent);
	const fmString = serializeFm(frontmatter, frontmatterFormat);
	const newContent = fmString ? `${fmString}\n\n${body}` : body;
	if (newContent === rawContent) return null;
	return { newRawContent: newContent };
}
