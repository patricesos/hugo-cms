export const SH_OPEN_ANGLE = 'SH_OPEN_ANGLE';
export const SH_OPEN_PERCENT = 'SH_OPEN_PERCENT';
export const SH_CLOSE_ANGLE = 'SH_CLOSE_ANGLE';
export const SH_CLOSE_PERCENT = 'SH_CLOSE_PERCENT';

const SH_CLOSE = `(?:${SH_CLOSE_ANGLE}|${SH_CLOSE_PERCENT})`;
const SH_OPEN = `(?:${SH_OPEN_ANGLE}|${SH_OPEN_PERCENT})`;

/**
 * Protège les shortcodes Hugo ({{< … >}}, {{% … %}}) avant passage
 * dans l'éditeur Tiptap en remplaçant les délimiteurs par des tokens
 * texte sûr. N'insère PAS de \n\n entre shortcodes — le pipeline Tiptap
 * gère les paragraphes via son serialiseur markdown ; splitShortcodeLines
 * rétablit les sauts de ligne pour le cas « sur une même ligne ».
 */
export function protectShortcodes(text: string): string {
	return text
		.replace(/\{\{</g, SH_OPEN_ANGLE)
		.replace(/\{\{%/g, SH_OPEN_PERCENT)
		.replace(/>\}\}/g, SH_CLOSE_ANGLE)
		.replace(/%\}\}/g, SH_CLOSE_PERCENT);
}

/**
 * Restaure les tokens en délimiteurs originaux.
 */
export function restoreShortcodes(text: string): string {
	return text
		.replace(new RegExp(SH_OPEN_ANGLE, 'g'), '{{<')
		.replace(new RegExp(SH_OPEN_PERCENT, 'g'), '{{%')
		.replace(new RegExp(SH_CLOSE_ANGLE, 'g'), '>}}')
		.replace(new RegExp(SH_CLOSE_PERCENT, 'g'), '%}}');
}

/**
 * Rétablit les sauts de ligne entre shortcodes consécutifs que
 * markdown-it a fusionnés sur une seule ligne.
 * À appliquer après restoreShortcodes() sur la sortie du sérialiseur.
 */
export function splitShortcodeLines(text: string): string {
	// Rétablit un saut de ligne entre shortcodes consécutifs fusionnés
	// sur une même ligne par le sérialiseur. N'utilise QUE [ \t]+ pour
	// ne PAS toucher aux lignes vides existantes (\n\n).
	return text.replace(/(%\}\}|>\}\})([ \t]+)(?=\{\{<|\{\{%)/g, '$1\n');
}
