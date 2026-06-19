export const SH_OPEN_ANGLE = 'SH_OPEN_ANGLE';
export const SH_OPEN_PERCENT = 'SH_OPEN_PERCENT';
export const SH_CLOSE_ANGLE = 'SH_CLOSE_ANGLE';
export const SH_CLOSE_PERCENT = 'SH_CLOSE_PERCENT';
/** @deprecated Utiliser SH_OPEN_ANGLE ou SH_OPEN_PERCENT */
export const SH_OPEN_SH = SH_OPEN_ANGLE;
/** @deprecated Utiliser SH_CLOSE_ANGLE ou SH_CLOSE_PERCENT */
export const SH_CLOSE_SH = SH_CLOSE_ANGLE;

const SH_CLOSE = `(?:${SH_CLOSE_ANGLE}|${SH_CLOSE_PERCENT})`;
const SH_OPEN = `(?:${SH_OPEN_ANGLE}|${SH_OPEN_PERCENT})`;

/**
 * Protège les shortcodes Hugo ({{< … >}}, {{% … %}}) avant passage
 * dans markdown-it en remplaçant les délimiteurs par des tokens
 * texte sûr. Insère aussi un \n\n entre shortcodes consécutifs
 * pour que markdown-it crée un paragraphe par shortcode.
 */
export function protectShortcodes(text: string): string {
	let result = text
		.replace(/\{\{</g, SH_OPEN_ANGLE)
		.replace(/\{\{%/g, SH_OPEN_PERCENT)
		.replace(/>\}\}/g, SH_CLOSE_ANGLE)
		.replace(/%\}\}/g, SH_CLOSE_PERCENT);
	result = result.replace(
		new RegExp(`(${SH_CLOSE})\\s*\\n(?!\\n)(\\s*)(${SH_OPEN})`, 'g'),
		'$1\n\n$2$3',
	);
	return result;
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
	return text.replace(/(%\}\}|>\}\})\s+(?=\{\{<|\{\{%)/g, '$1\n');
}
