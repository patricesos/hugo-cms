export const SH_OPEN_SH = 'SH_OPEN_SH';
export const SH_CLOSE_SH = 'SH_CLOSE_SH';

/**
 * Protège les shortcodes Hugo ({{< … >}}, {{% … %}}) avant passage
 * dans markdown-it en remplaçant les délimiteurs par des tokens
 * texte sûr. Insère aussi un \n\n entre shortcodes consécutifs
 * pour que markdown-it crée un paragraphe par shortcode.
 */
export function protectShortcodes(text: string): string {
	let result = text
		.replace(/\{\{</g, SH_OPEN_SH)
		.replace(/\{\{%/g, SH_OPEN_SH)
		.replace(/>\}\}/g, SH_CLOSE_SH)
		.replace(/%\}\}/g, SH_CLOSE_SH);
	result = result.replace(
		new RegExp(`(${SH_CLOSE_SH})\\s*\\n(?!\\n)(\\s*)(${SH_OPEN_SH})`, 'g'),
		'$1\n\n$2$3',
	);
	return result;
}

/**
 * Restaure les tokens SH_OPEN_SH / SH_CLOSE_SH en délimiteurs
 * originaux {{<, >}}, {{%, %}}.
 */
export function restoreShortcodes(text: string): string {
	return text
		.replace(new RegExp(SH_OPEN_SH, 'g'), '{{<')
		.replace(new RegExp(SH_CLOSE_SH, 'g'), '>}}');
}

/**
 * Rétablit les sauts de ligne entre shortcodes consécutifs que
 * markdown-it a fusionnés sur une seule ligne.
 * À appliquer après restoreShortcodes() sur la sortie du sérialiseur.
 */
export function splitShortcodeLines(text: string): string {
	return text.replace(/(\}\})\s+(?=\{\{<)/g, '}}\n');
}
