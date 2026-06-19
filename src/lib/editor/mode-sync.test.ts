// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import {
	getRawBody,
	splitRawContent,
	serializeFm,
	countYamlComments,
	ModeSync,
} from './mode-sync.svelte';

describe('mode-sync — helpers purs', () => {
	it('serializeFm: YAML avec frontmatter', () => {
		const result = serializeFm({ title: 'Test', draft: true }, 'yaml');
		expect(result).toContain('---');
		expect(result).toContain('title: Test');
		expect(result).toContain('draft: true');
	});

	it('serializeFm: TOML avec frontmatter', () => {
		const result = serializeFm({ title: 'Test', draft: true }, 'toml');
		expect(result).toContain('+++');
		expect(result).toContain('title = "Test"');
	});

	it('serializeFm: YAML vide retourne --- avec contenu vide', () => {
		const result = serializeFm({}, 'yaml');
		expect(result).toBe('---\n{}\n---');
	});

	it('serializeFm: normalise les dates en YYYY-MM-DD (M-003)', () => {
		const fm = { title: 'Test', date: new Date('2026-06-19'), lastmod: new Date('2026-06-18') };
		const result = serializeFm(fm, 'yaml');
		expect(result).toContain("date: '2026-06-19'");
		expect(result).toContain("lastmod: '2026-06-18'");
		expect(result).not.toContain('T00:00:00.000Z');
	});

	it('serializeFm: normalise les dates dans les objets imbriqués (M-003)', () => {
		const fm = { metadata: { published: new Date('2025-01-15') } };
		const result = serializeFm(fm, 'yaml');
		expect(result).toContain("published: '2025-01-15'");
	});

	it('serializeFm: normalise les dates dans les tableaux (M-003)', () => {
		const fm = { dates: [new Date('2026-01-01'), new Date('2026-06-15')] };
		const result = serializeFm(fm, 'yaml');
		expect(result).toContain("- '2026-01-01'");
		expect(result).toContain("- '2026-06-15'");
	});

	it('splitRawContent: extrait body et frontmatter YAML', () => {
		const text = '---\ntitle: Test\n---\n\nBody content';
		const { frontmatter, body, format } = splitRawContent(text);
		expect(frontmatter).toEqual({ title: 'Test' });
		expect(body).toBe('Body content');
		expect(format).toBe('yaml');
	});

	it('splitRawContent: extrait body et frontmatter TOML', () => {
		const text = '+++\ntitle = "Test"\n+++\n\nBody content';
		const { frontmatter, body, format } = splitRawContent(text);
		expect(frontmatter).toEqual({ title: 'Test' });
		expect(body).toBe('Body content');
		expect(format).toBe('toml');
	});

	it('splitRawContent: body seul → pas de frontmatter', () => {
		const { frontmatter, body } = splitRawContent('Just body');
		expect(frontmatter).toBeNull();
		expect(body).toBe('Just body');
	});

	it('getRawBody: ignore le frontmatter', () => {
		const body = getRawBody('---\ntitle: Test\n---\n\nBody text');
		expect(body).toBe('Body text');
	});

	it('getRawBody: sans frontmatter, retourne le texte entier', () => {
		const body = getRawBody('Just body');
		expect(body).toBe('Just body');
	});

	it('countYamlComments: détecte les commentaires YAML', () => {
		expect(countYamlComments('# ceci est un commentaire\ntitle: Test')).toBe(1);
	});

	it('countYamlComments: commentaires avec indentation', () => {
		expect(countYamlComments('  # commentaire indenté\ntitle: Test')).toBe(1);
	});

	it('countYamlComments: pas de commentaire → 0', () => {
		expect(countYamlComments('title: Test\ndraft: true')).toBe(0);
	});

	it('countYamlComments: bloc vide → 0', () => {
		expect(countYamlComments('')).toBe(0);
	});

	it('countYamlComments: plusieurs commentaires', () => {
		expect(countYamlComments('# titre\n# auteur\ntitle: Test\ndate: 2026-01-01')).toBe(2);
	});

	it('splitRawContent: les commentaires YAML sont perdus après parse+serialize (M-002)', () => {
		const original = '---\n# Note: ceci sera perdu\ntitle: Test\n---\n\nBody';
		const { frontmatter } = splitRawContent(original);
		const result = serializeFm(frontmatter!, 'yaml');
		expect(result).not.toContain('# Note');
		expect(result).toContain('title: Test');
	});
});

describe('ModeSync — loadContent', () => {
	let sync: ModeSync;

	beforeEach(() => {
		sync = new ModeSync();
	});

	it('rawMode=false → retourne buildEditor avec le content', () => {
		const action = sync.loadContent('Hello', false, {}, 'yaml');
		expect(action.buildEditor).toBe('Hello');
		expect(sync.rawContent).toBe('');
	});

	it('rawMode=true → rawContent = content (sans frontmatter)', () => {
		const action = sync.loadContent('Hello', true, {}, 'yaml');
		expect(action.buildEditor).toBeUndefined();
		expect(sync.rawContent).toBe('Hello');
	});

	it('rawMode=true avec frontmatter → rawContent contient FM + body', () => {
		const action = sync.loadContent('Body', true, { title: 'Test' }, 'yaml');
		expect(action.buildEditor).toBeUndefined();
		expect(sync.rawContent).toContain('title: Test');
		expect(sync.rawContent).toContain('Body');
	});

	it('loadContent deux fois avec des contenus différents (simule changement rapide d\'onglet)', () => {
		sync.loadContent('Onglet A', true, {}, 'yaml');
		expect(sync.rawContent).toContain('Onglet A');

		sync.loadContent('Onglet B', true, {}, 'yaml');
		expect(sync.rawContent).toContain('Onglet B');
		expect(sync.rawContent).not.toContain('Onglet A');
	});
});

describe('ModeSync — toggleToRaw / toggleToWysiwyg', () => {
	let sync: ModeSync;

	beforeEach(() => {
		sync = new ModeSync();
	});

	it('toggleToRaw capture le markdown Tiptap', () => {
		sync.toggleToRaw(() => '**bold** markdown', {}, 'yaml');
		expect(sync.rawContent).toContain('**bold** markdown');
	});

	it('toggleToRaw avec frontmatter → rawContent inclut la FM', () => {
		sync.toggleToRaw(() => 'Body', { title: 'Test' }, 'yaml');
		expect(sync.rawContent).toContain('title: Test');
		expect(sync.rawContent).toContain('Body');
	});

	it('toggleToRaw préfixe avec le frontmatter sérialisé', () => {
		sync.toggleToRaw(() => 'Hello', { draft: true }, 'yaml');
		expect(sync.rawContent).toMatch(/^---\n/);
	});

	it('toggleToWysiwyg extrait le body depuis rawContent', () => {
		sync.rawContent = '---\ntitle: Test\n---\n\nBody text';
		const { body } = sync.toggleToWysiwyg();
		expect(body).toBe('Body text');
	});

	it('toggleToWysiwyg: sans frontmatter, retourne le rawContent complet', () => {
		sync.rawContent = 'Just body';
		const { body } = sync.toggleToWysiwyg();
		expect(body).toBe('Just body');
	});
});

describe('ModeSync — toRawFromWysiwyg / toWysiwygFromRaw', () => {
	let sync: ModeSync;

	beforeEach(() => {
		sync = new ModeSync();
	});

	it('toRawFromWysiwyg: applique restore + splitShortcodeLines + compose FM', () => {
		const result = sync.toRawFromWysiwyg('{{< img >}}', { title: 'Test' }, 'yaml');
		expect(result).toContain('title: Test');
		expect(result).toContain('{{< img >}}');
	});

	it('toWysiwygFromRaw: extrait body et protège les shortcodes', () => {
		const result = sync.toWysiwygFromRaw('---\ntitle: Test\n---\n\n{{% shortcode %}}');
		expect(result.body).toContain('SH_OPEN_PERCENT shortcode SH_CLOSE_PERCENT');
		expect(result.frontmatter).toEqual({ title: 'Test' });
		expect(result.format).toBe('yaml');
	});
});

describe('ModeSync — toggleToWysiwyg protection des shortcodes', () => {
	let sync: ModeSync;

	beforeEach(() => {
		sync = new ModeSync();
	});

	it('protège les shortcodes lors du passage raw → wysiwyg', () => {
		sync.rawContent = '---\ntitle: Test\n---\n\n{{< gallery >}}\n{{< img src="a.jpg" >}}\n{{< /gallery >}}';
		const { body } = sync.toggleToWysiwyg();
		expect(body).not.toContain('{{<');
		expect(body).toContain('SH_OPEN_ANGLE');
	});

	it('toggleToWysiwyg et toWysiwygFromRaw produisent le même body', () => {
		const raw = '---\ntitle: x\n---\n\n{{% note %}}texte{{% /note %}}';
		sync.rawContent = raw;
		const fromToggle = sync.toggleToWysiwyg();
		const fromDirect = sync.toWysiwygFromRaw(raw);
		expect(fromToggle.body).toBe(fromDirect.body);
	});
});

describe('ModeSync — handleFrontmatterChange', () => {
	let sync: ModeSync;

	beforeEach(() => {
		sync = new ModeSync();
	});

	it('loadContent inclut déjà le FM → handleFrontmatterChange n\'a rien à faire', () => {
		sync.loadContent('Body', true, { title: 'Test' }, 'yaml');
		// loadContent a déjà composé le FM dans rawContent
		expect(sync.handleFrontmatterChange({ title: 'Test' }, 'yaml')).toBe(false);
	});

	it('frontmatter changé après loadContent → rawContent mis à jour', () => {
		sync.loadContent('Body', true, { title: 'Old' }, 'yaml');
		expect(sync.handleFrontmatterChange({ title: 'New' }, 'yaml')).toBe(true);
		expect(sync.rawContent).toContain('title: New');
		expect(sync.rawContent).toContain('Body');
		expect(sync.rawContent).not.toContain('title: Old');
	});

	it('frontmatter vidé → rawContent contient FM vide sérialisé', () => {
		sync.loadContent('Body', true, { title: 'Test' }, 'yaml');
		expect(sync.handleFrontmatterChange({}, 'yaml')).toBe(true);
		expect(sync.rawContent).toContain('{}');
		expect(sync.rawContent).toContain('Body');
	});
});

describe('ModeSync — régression K-010 (pas de flag contentUpdatedByEffect)', () => {
	let sync: ModeSync;

	beforeEach(() => {
		sync = new ModeSync();
	});

	it('loadContent + toggleToRaw séquentiels → pas de double traitement', () => {
		// Simule la séquence K-010 : changement d'onglet vers un contenu
		// en mode raw, suivi d'un toggle vers raw (déjà en raw → rien).
		sync.loadContent('Contenu B', true, {}, 'yaml');
		expect(sync.rawContent).toBe('Contenu B');

		// Si on appelle toggleToRaw APRÈS (cas where content change
		// et rawMode change dans la même frame), il n'y a pas de flag
		// à checker — l'orchestrateur décide quelle méthode appeler.
		// Ce test vérifie juste qu'on peut appeler les deux sans crash
		// et que le résultat est cohérent.
		sync.toggleToRaw(() => 'Contenu B (from Tiptap)', {}, 'yaml');
		expect(sync.rawContent).toContain('Contenu B');
	});

	it('toggleToRaw puis toggleToWysiwyg → round-trip propre', () => {
		sync.toggleToRaw(() => '**Hello**', { title: 'Test' }, 'yaml');
		expect(sync.rawContent).toContain('**Hello**');
		expect(sync.rawContent).toContain('title: Test');

		const { body } = sync.toggleToWysiwyg();
		expect(body).not.toContain('title: Test');
		expect(body).toBe('**Hello**');
	});

	it('pas de flag global — deux instances isolées', () => {
		const syncA = new ModeSync();
		const syncB = new ModeSync();

		syncA.loadContent('Contenu A', true, {}, 'yaml');
		syncB.loadContent('Contenu B', true, {}, 'yaml');

		expect(syncA.rawContent).toBe('Contenu A');
		expect(syncB.rawContent).toBe('Contenu B');
	});
});
