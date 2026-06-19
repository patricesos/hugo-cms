import yaml from 'js-yaml';
import { parse, stringify } from '@iarna/toml';
import type { EditorView } from '@codemirror/view';
import { protectShortcodes, restoreShortcodes, splitShortcodeLines } from '$lib/shortcode-utils';

// =============================================================================
// Helpers purs (exportés, sans état)
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
		const rest = trimmed.slice(endIdx + 3).trimStart();
		if (!yamlBlock) return { frontmatter: null, body: rest, format: 'yaml' };
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
// Store de coordination — une instance par éditeur
// =============================================================================

/**
 * Assemble le frontmatter sérialisé et le body en une string brute.
 */
function composeRaw(fm: Record<string, unknown>, format: 'yaml' | 'toml', body: string): string {
	const fmString = Object.keys(fm).length > 0 ? serializeFm(fm, format) : '';
	return fmString ? `${fmString}\n\n${body}` : body;
}

export class ModeSync {
	/** Contenu brut complet (FM + body) quand en mode raw */
	rawContent = $state('');

	/** Instance CodeMirror 6, créée/détruite par RawEditor */
	cmView = $state<EditorView | null>(null);

	private _prevFmSnapshot = '';

	/**
	 * Convertit le markdown Tiptap en représentation brute.
	 * Applique restoreShortcodes() + splitShortcodeLines(), puis
	 * préfixe avec le frontmatter sérialisé.
	 */
	toRawFromWysiwyg(tiptapMarkdown: string, fm: Record<string, unknown>, format: 'yaml' | 'toml'): string {
		const body = splitShortcodeLines(restoreShortcodes(tiptapMarkdown));
		return composeRaw(fm, format, body);
	}

	/**
	 * Extrait le body protégé depuis une string brute pour le WYSIWYG.
	 * Applique protectShortcodes() sur le body extrait.
	 */
	toWysiwygFromRaw(raw: string): { body: string; frontmatter: Record<string, unknown> | null; format: 'yaml' | 'toml' } {
		const { frontmatter, body, format } = splitRawContent(raw);
		return { body: protectShortcodes(body), frontmatter, format };
	}

	/**
	 * Charge un nouveau contenu depuis l'extérieur (changement d'onglet,
	 * initialisation). Appelé EXPLICITEMENT par l'orchestrateur, pas via
	 * un $effect qui devine. Met à jour rawContent si nécessaire.
	 *
	 * Retourne une action à appliquer sur le DOM Tiptap :
	 *  - { setWysiwygContent } : setContent sur un éditeur existant
	 *  - { buildEditor } : créer/remplacer l'éditeur Tiptap
	 *  - {} : rien à faire (mode raw)
	 */
	loadContent(content: string, rawMode: boolean, fm: Record<string, unknown>, format: 'yaml' | 'toml'): { setWysiwygContent?: string; buildEditor?: string } {
		// On réinitialise le snapshot pour que handleFrontmatterChange
		// puisse faire une première passe de sérialisation (ex : FM vide
		// → `---\n{}\n---`). Sans ça, le FM $effect ne voyait pas de
		// changement et ne sérialisait jamais le frontmatter initial.
		this._prevFmSnapshot = '';
		if (rawMode) {
			this.rawContent = composeRaw(fm, format, content);
			return {};
		}
		this.rawContent = '';
		return { buildEditor: content };
	}

	/**
	 * Bascule vers le mode raw : capture le markdown depuis Tiptap et
	 * le stocke dans rawContent.
	 */
	toggleToRaw(getTiptapMarkdown: () => string, fm: Record<string, unknown>, format: 'yaml' | 'toml'): void {
		this.rawContent = this.toRawFromWysiwyg(getTiptapMarkdown(), fm, format);
	}

	/**
	 * Bascule vers le mode WYSIWYG : extrait le body depuis rawContent.
	 */
	toggleToWysiwyg(): { body: string } {
		return { body: getRawBody(this.rawContent) };
	}

	/**
	 * Met à jour rawContent quand le frontmatter change en mode raw.
	 * Retourne true si rawContent a été modifié.
	 */
	handleFrontmatterChange(frontmatter: Record<string, unknown>, format: 'yaml' | 'toml'): boolean {
		const snapshot = JSON.stringify(frontmatter) + '|' + format;
		if (snapshot === this._prevFmSnapshot) return false;
		this._prevFmSnapshot = snapshot;

		const body = getRawBody(this.rawContent);
		// Toujours sérialiser le FM, même vide → `---\n{}\n---`.
		// composeRaw() saute le FM vide pour les chargements initiaux,
		// mais handleFrontmatterChange doit préserver l'ancien comportement
		// où le FM $effect sérialisait même `{}`.
		const fmString = serializeFm(frontmatter, format);
		const newContent = `${fmString}\n\n${body}`;
		if (newContent === this.rawContent) return false;
		this.rawContent = newContent;
		return true;
	}
}
