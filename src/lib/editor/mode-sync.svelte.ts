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

/**
 * Parcourt récursivement un objet et convertit les valeurs Date
 * en chaînes YYYY-MM-DD. Évite que yaml.dump() les sérialise en
 * ISO complet (2026-06-19 → 2026-06-19T00:00:00.000Z).
 */
function normalizeDates(value: unknown): unknown {
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (Array.isArray(value)) {
		return value.map(normalizeDates);
	}
	if (value && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(obj)) {
			result[key] = normalizeDates(obj[key]);
		}
		return result;
	}
	return value;
}

export function serializeFm(fm: Record<string, unknown>, format: 'yaml' | 'toml'): string {
	const normalized = normalizeDates(fm) as Record<string, unknown>;
	if (format === 'toml') {
		return `+++\n${stringify(normalized as unknown as import('@iarna/toml').JsonMap)}+++`;
	}
	return `---\n${yaml.dump(normalized, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }).trim()}\n---`;
}

/**
 * Compte les lignes de commentaire YAML (commençant par #) dans un bloc.
 * Utile pour avertir que ces commentaires seront perdus au round-trip.
 */
export function countYamlComments(yamlBlock: string): number {
	return (yamlBlock.match(/^\s*#/gm) || []).length;
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
		// Normalisation : le trimStart() perd l'espacement original entre FM et
		// body. Les fonctions d'action (resetAction, handleContentChangeAction)
		// utilisent \n\n fixe à la reconstruction. Choix délibéré — voir M-004.
		const rest = trimmed.slice(endIdx + 3).trimStart();
		if (!yamlBlock) return { frontmatter: null, body: rest, format: 'yaml' };
		// M-002 : les commentaires YAML (# ...) sont perdus par yaml.load()/dump().
		// On avertit l'utilisateur à la première détection.
		const commentCount = countYamlComments(yamlBlock);
		if (commentCount > 0) {
			console.warn(
				`[mode-sync] ${commentCount} ligne(s) de commentaire YAML détectée(s) dans le frontmatter. ` +
				'Les commentaires seront perdus à la réécriture (M-002). ' +
				'Envisagez de les déplacer dans un champ de métadonnées si vous souhaitez les conserver.',
			);
		}
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
		// Normalisation volontaire : on force \n\n entre FM et body.
		// La fonction splitRawContent() strip le whitespace à la lecture
		// via trimStart(), donc l'espacement original est perdu de toute
		// façon. Voir M-004 dans PLANNING.md.
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
		// Normalisation volontaire : \n\n fixe entre FM et body. Voir M-004.
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
