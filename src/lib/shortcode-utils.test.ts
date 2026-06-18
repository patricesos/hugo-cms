import { describe, it, expect } from 'vitest';
import { protectShortcodes, restoreShortcodes, splitShortcodeLines } from './shortcode-utils';

describe('protectShortcodes', () => {
	it('remplace {{< par SH_OPEN_SH', () => {
		expect(protectShortcodes('{{< gallery >}}')).toBe('SH_OPEN_SH gallery SH_CLOSE_SH');
	});

	it('remplace >}} par SH_CLOSE_SH', () => {
		expect(protectShortcodes('{{< img src="x.jpg" >}}')).toBe('SH_OPEN_SH img src="x.jpg" SH_CLOSE_SH');
	});

	it('remplace aussi {{% et %}}', () => {
		expect(protectShortcodes('{{% shortcode %}}')).toBe('SH_OPEN_SH shortcode SH_CLOSE_SH');
	});

	it('laisse le texte normal inchangé', () => {
		expect(protectShortcodes('Un peu de texte **gras** et *italique*.'))
			.toBe('Un peu de texte **gras** et *italique*.');
	});

	it('insère un \\n\\n entre shortcodes consécutifs', () => {
		const input = '{{< gallery >}}\n{{< img src="a.jpg" >}}\n{{< img src="b.jpg" >}}\n{{< /gallery >}}';
		const result = protectShortcodes(input);
		expect(result).toBe(
			'SH_OPEN_SH gallery SH_CLOSE_SH\n\nSH_OPEN_SH img src="a.jpg" SH_CLOSE_SH\n\nSH_OPEN_SH img src="b.jpg" SH_CLOSE_SH\n\nSH_OPEN_SH /gallery SH_CLOSE_SH',
		);
	});

	it('ne duplique pas les \\n\\n existants', () => {
		const input = '{{< a >}}\n\n{{< b >}}';
		const result = protectShortcodes(input);
		expect(result).toBe('SH_OPEN_SH a SH_CLOSE_SH\n\nSH_OPEN_SH b SH_CLOSE_SH');
	});

	it('gère les espaces après >}}', () => {
		const input = '{{< a >}} \n {{< b >}}';
		const result = protectShortcodes(input);
		expect(result).toBe('SH_OPEN_SH a SH_CLOSE_SH\n\n SH_OPEN_SH b SH_CLOSE_SH');
	});

	it('laisse les \\n normaux dans le texte non-shortcode', () => {
		const input = 'ligne 1\nligne 2\n{{< img >}}\nfin';
		const result = protectShortcodes(input);
		expect(result).toBe('ligne 1\nligne 2\nSH_OPEN_SH img SH_CLOSE_SH\nfin');
	});
});

describe('restoreShortcodes', () => {
	it('remet SH_OPEN_SH → {{<', () => {
		expect(restoreShortcodes('SH_OPEN_SH gallery SH_CLOSE_SH')).toBe('{{< gallery >}}');
	});

	it('remet SH_CLOSE_SH → >}}', () => {
		expect(restoreShortcodes('SH_OPEN_SH img SH_CLOSE_SH')).toBe('{{< img >}}');
	});

	it('gère plusieurs shortcodes', () => {
		const input = 'SH_OPEN_SH a SH_CLOSE_SH SH_OPEN_SH b SH_CLOSE_SH';
		expect(restoreShortcodes(input)).toBe('{{< a >}} {{< b >}}');
	});

	it('laisse le texte normal inchangé', () => {
		expect(restoreShortcodes('Hello **world**')).toBe('Hello **world**');
	});
});

describe('splitShortcodeLines', () => {
	it('coupe les shortcodes consécutifs sur une ligne', () => {
		const input = '{{< gallery >}} {{< img src="a.jpg" >}} {{< /gallery >}}';
		expect(splitShortcodeLines(input)).toBe('{{< gallery >}}\n{{< img src="a.jpg" >}}\n{{< /gallery >}}');
	});

	it('ne modifie pas les shortcodes déjà sur des lignes séparées', () => {
		const input = '{{< a >}}\n{{< b >}}';
		expect(splitShortcodeLines(input)).toBe('{{< a >}}\n{{< b >}}');
	});

	it('ne coupe pas entre shortcode et texte normal', () => {
		const input = '{{< a >}} du texte {{< b >}}';
		expect(splitShortcodeLines(input)).toBe('{{< a >}} du texte {{< b >}}');
	});

	it('gère les espaces multiples entre shortcodes', () => {
		const input = '{{< a >}}   {{< b >}}';
		expect(splitShortcodeLines(input)).toBe('{{< a >}}\n{{< b >}}');
	});

	it('laisse le texte sans shortcodes inchangé', () => {
		expect(splitShortcodeLines('Un paragraphe normal.')).toBe('Un paragraphe normal.');
	});
});

describe('round-trip', () => {
	it('raw → protected → serialisé → restored → split revient à l\'original', () => {
		const original = '{{< gallery >}}\n{{< img src="a.jpg" >}}\n{{< img src="b.jpg" >}}\n{{< /gallery >}}';

		const protected_text = protectShortcodes(original);
		const restored = restoreShortcodes(protected_text);
		const result = splitShortcodeLines(restored);

		expect(result).toBe(original);
	});

	it('round-trip préserve le texte normal autour des shortcodes', () => {
		const original = 'Début\n{{< img >}}\nMilieu\n{{< /img >}}\nFin';
		const protected_text = protectShortcodes(original);
		const restored = restoreShortcodes(protected_text);
		const result = splitShortcodeLines(restored);
		expect(result).toBe(original);
	});

	it('round-trip avec shortcode unique (sans \n\n à supprimer)', () => {
		const original = '{{< seul >}}';
		expect(splitShortcodeLines(restoreShortcodes(protectShortcodes(original)))).toBe(original);
	});

	it('round-trip préserve les lignes vides existantes', () => {
		const original = '{{< a >}}\n\ndu texte\n\n{{< b >}}';
		expect(splitShortcodeLines(restoreShortcodes(protectShortcodes(original)))).toBe(original);
	});
});
