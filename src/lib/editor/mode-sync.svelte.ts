import { protectShortcodes, restoreShortcodes, splitShortcodeLines } from '$lib/shortcode-utils';
import { splitRawContent, getRawBody, composeRaw, serializeFm } from '$lib/frontmatter';

// =============================================================================
// Store de coordination — une instance par éditeur
// =============================================================================

export class ModeSync {
	/** Contenu brut complet (FM + body) quand en mode raw */
	rawContent = $state('');

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
		return { buildEditor: protectShortcodes(content) };
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
		const { body } = this.toWysiwygFromRaw(this.rawContent);
		return { body };
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
		const fmString = Object.keys(frontmatter).length > 0 ? serializeFm(frontmatter, format) : '';
		const newContent = fmString ? `${fmString}\n\n${body}` : body;
		if (newContent === this.rawContent) return false;
		this.rawContent = newContent;
		return true;
	}
}
