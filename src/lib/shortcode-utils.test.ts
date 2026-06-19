import { describe, it, expect } from 'vitest';
import { protectShortcodes, restoreShortcodes, splitShortcodeLines } from './shortcode-utils';

describe('protectShortcodes', () => {
	it('remplace {{< → SH_OPEN_ANGLE et >}} → SH_CLOSE_ANGLE', () => {
		expect(protectShortcodes('{{< gallery >}}')).toBe('SH_OPEN_ANGLE gallery SH_CLOSE_ANGLE');
	});

	it('remplace >}} par SH_CLOSE_ANGLE', () => {
		expect(protectShortcodes('{{< img src="x.jpg" >}}')).toBe('SH_OPEN_ANGLE img src="x.jpg" SH_CLOSE_ANGLE');
	});

	it('remplace {{% → SH_OPEN_PERCENT et %}} → SH_CLOSE_PERCENT', () => {
		expect(protectShortcodes('{{% shortcode %}}')).toBe('SH_OPEN_PERCENT shortcode SH_CLOSE_PERCENT');
	});

	it('préserve la distinction ouverture et fermeture', () => {
		expect(protectShortcodes('{{< img >}}')).toContain('SH_OPEN_ANGLE');
		expect(protectShortcodes('{{< img >}}')).toContain('SH_CLOSE_ANGLE');
		expect(protectShortcodes('{{% img %}}')).toContain('SH_OPEN_PERCENT');
		expect(protectShortcodes('{{% img %}}')).toContain('SH_CLOSE_PERCENT');
	});

	it('laisse le texte normal inchangé', () => {
		expect(protectShortcodes('Un peu de texte **gras** et *italique*.'))
			.toBe('Un peu de texte **gras** et *italique*.');
	});

	it('laisse les \\n simples entre shortcodes consécutifs (pas de \\n\\n ajouté)', () => {
		const input = '{{< gallery >}}\n{{< img src="a.jpg" >}}\n{{< img src="b.jpg" >}}\n{{< /gallery >}}';
		const result = protectShortcodes(input);
		expect(result).toBe(
			'SH_OPEN_ANGLE gallery SH_CLOSE_ANGLE\nSH_OPEN_ANGLE img src="a.jpg" SH_CLOSE_ANGLE\nSH_OPEN_ANGLE img src="b.jpg" SH_CLOSE_ANGLE\nSH_OPEN_ANGLE /gallery SH_CLOSE_ANGLE',
		);
	});

	it('laisse les \\n simples entre shortcodes % consécutifs', () => {
		const input = '{{% a %}}\n{{% b %}}\n{{% /c %}}';
		const result = protectShortcodes(input);
		expect(result).toBe(
			'SH_OPEN_PERCENT a SH_CLOSE_PERCENT\nSH_OPEN_PERCENT b SH_CLOSE_PERCENT\nSH_OPEN_PERCENT /c SH_CLOSE_PERCENT',
		);
	});

	it('préserve les \\n\\n existants (pas ajoutés non plus)', () => {
		const input = '{{< a >}}\n\n{{< b >}}';
		const result = protectShortcodes(input);
		expect(result).toBe('SH_OPEN_ANGLE a SH_CLOSE_ANGLE\n\nSH_OPEN_ANGLE b SH_CLOSE_ANGLE');
	});

	it('gère les espaces après le close (sans insérer \\n\\n)', () => {
		const input = '{{< a >}} \n {{< b >}}';
		const result = protectShortcodes(input);
		expect(result).toBe('SH_OPEN_ANGLE a SH_CLOSE_ANGLE \n SH_OPEN_ANGLE b SH_CLOSE_ANGLE');
	});

	it('laisse les \\n normaux dans le texte non-shortcode', () => {
		const input = 'ligne 1\nligne 2\n{{< img >}}\nfin';
		const result = protectShortcodes(input);
		expect(result).toBe('ligne 1\nligne 2\nSH_OPEN_ANGLE img SH_CLOSE_ANGLE\nfin');
	});
});

describe('restoreShortcodes', () => {
	it('remet SH_OPEN_ANGLE → {{< et SH_CLOSE_ANGLE → >}}', () => {
		expect(restoreShortcodes('SH_OPEN_ANGLE gallery SH_CLOSE_ANGLE')).toBe('{{< gallery >}}');
	});

	it('remet SH_OPEN_PERCENT → {{% et SH_CLOSE_PERCENT → %}}', () => {
		expect(restoreShortcodes('SH_OPEN_PERCENT img SH_CLOSE_PERCENT')).toBe('{{% img %}}');
	});

	it('gère plusieurs shortcodes avec un mix de >}} et %}}', () => {
		const input = 'SH_OPEN_ANGLE gallery SH_CLOSE_ANGLE SH_OPEN_PERCENT img SH_CLOSE_PERCENT';
		expect(restoreShortcodes(input)).toBe('{{< gallery >}} {{% img %}}');
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

	it('préserve les lignes vides entre groupes de shortcodes (régression round-trip)', () => {
		const input = '{{< /gallery >}}\n\n{{< img >}}';
		expect(splitShortcodeLines(input)).toBe(input);
	});
});

describe('round-trip', () => {
	it('raw → protected → restored → split : round-trip identique à l\'original', () => {
		// protectShortcodes n'insère plus \n\n : le round-trip est
		// parfait pour des shortcodes sur des lignes adjacentes.
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

	it('round-trip préserve {{% %}} (M-001)', () => {
		const original = '{{% notice tip %}}\nContenu important\n{{% /notice %}}';
		expect(splitShortcodeLines(restoreShortcodes(protectShortcodes(original)))).toBe(original);
	});

	it('round-trip préserve un mélange de {{< >}} et {{% %}} (M-001)', () => {
		const original = '{{% alert warning %}}\n{{< figure src="img.jpg" >}}\n{{% /alert %}}';
		expect(splitShortcodeLines(restoreShortcodes(protectShortcodes(original)))).toBe(original);
	});

	it('round-trip préserve {{% %}} seul sur une ligne (M-001)', () => {
		const original = '{{% seul %}}';
		expect(splitShortcodeLines(restoreShortcodes(protectShortcodes(original)))).toBe(original);
	});

	it('round-trip préserve shortcodes % consécutifs (M-001)', () => {
		const original = '{{% a %}}\n{{% b %}}\n{{% c %}}';
		expect(splitShortcodeLines(restoreShortcodes(protectShortcodes(original)))).toBe(original);
	});
});
