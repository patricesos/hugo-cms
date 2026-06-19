// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
	resetAction,
	handleContentChangeAction,
	handleRawModeChangeActionWithRaw,
	handleFrontmatterChangeAction,
	getRawBody,
	splitRawContent,
	serializeFm,
} from './mode-sync.svelte';

describe('mode-sync — helpers', () => {
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
});

describe('mode-sync — resetAction', () => {
	it('rawMode=false → newRawContent est vide', () => {
		const action = resetAction('Hello', false, {}, 'yaml');
		expect(action.newRawContent).toBe('');
	});

	it('rawMode=true → newRawContent = content (sans frontmatter)', () => {
		const action = resetAction('Hello', true, {}, 'yaml');
		expect(action.newRawContent).toBe('Hello');
	});

	it('rawMode=true avec frontmatter → newRawContent contient la FM', () => {
		const action = resetAction('Body', true, { title: 'Test' }, 'yaml');
		expect(action.newRawContent).toContain('title: Test');
		expect(action.newRawContent).toContain('Body');
	});
});

describe('mode-sync — handleContentChangeAction', () => {
	it('rawMode=false → retourne setWysiwygContent', () => {
		const action = handleContentChangeAction('New content', false, {}, 'yaml');
		expect(action.newRawContent).toBeUndefined();
		expect(action.setWysiwygContent).toBe('New content');
	});

	it('rawMode=true → retourne newRawContent', () => {
		const action = handleContentChangeAction('New content', true, {}, 'yaml');
		expect(action.newRawContent).toBe('New content');
		expect(action.setWysiwygContent).toBeUndefined();
	});

	it('rawMode=true avec frontmatter → newRawContent inclut la FM', () => {
		const action = handleContentChangeAction('Body', true, { title: 'Test' }, 'yaml');
		expect(action.newRawContent).toContain('title: Test');
		expect(action.newRawContent).toContain('Body');
	});

	it('pose contentUpdatedByEffect (vérifié via flag skip dans rawMode toggle)', () => {
		// content change en rawMode pose le flag
		handleContentChangeAction('Content', true, {}, 'yaml');
		// rawMode toggle après content change doit skip (flag actif)
		const action = handleRawModeChangeActionWithRaw(false, {}, 'yaml', 'Content', () => '', '');
		// Si le flag est posé, l'action retourne {} (skip) — pas de buildEditor
		expect(action.buildEditor).toBeUndefined();
		expect(action.newRawContent).toBeUndefined();
	});
});

describe('mode-sync — handleRawModeChangeActionWithRaw', () => {
	it('rawMode=true → capture depuis getMarkdown', () => {
		const getMarkdown = () => '**bold** markdown';
		const action = handleRawModeChangeActionWithRaw(true, {}, 'yaml', 'current', getMarkdown, '');
		expect(action.newRawContent).toContain('**bold** markdown');
	});

	it('rawMode=true, getMarkdown vide → fallback sur currentContent', () => {
		const getMarkdown = () => '';
		const action = handleRawModeChangeActionWithRaw(true, {}, 'yaml', 'fallback', getMarkdown, '');
		expect(action.newRawContent).toContain('fallback');
	});

	it('rawMode=false → retourne buildEditor avec le body extrait', () => {
		const action = handleRawModeChangeActionWithRaw(false, {}, 'yaml', 'ignored', () => '', '---\n{}\n---\n\nBody text');
		expect(action.buildEditor).toBe('Body text');
	});

	it('rawMode=false sans frontmatter → buildEditor avec le rawContent complet', () => {
		const action = handleRawModeChangeActionWithRaw(false, {}, 'yaml', 'ignored', () => '', 'Just body');
		expect(action.buildEditor).toBe('Just body');
	});
});

describe('mode-sync — régression K-010 (toggle + content simultané)', () => {
	it('content change seul en rawMode → newRawContent', () => {
		const action = handleContentChangeAction('Onglet B', true, {}, 'yaml');
		expect(action.newRawContent).toBe('Onglet B');
	});

	it('toggle rawMode après content change → skip (contentUpdatedByEffect actif)', () => {
		// Changement de contenu (pose le flag)
		handleContentChangeAction('B', true, {}, 'yaml');
		// RawMode toggle (doit skip car le flag est posé)
		const action = handleRawModeChangeActionWithRaw(true, {}, 'yaml', 'B', () => '', 'B');
		// Skip = pas de nouveau rawContent (déjà mis à jour par handleContentChangeAction)
		expect(action.newRawContent).toBeUndefined();
		expect(action.buildEditor).toBeUndefined();
	});

	it('toggle rawMode SEUL (pas de content change avant) → capture depuis Tiptap', () => {
		const getMarkdown = () => 'Markdown from Tiptap';
		const action = handleRawModeChangeActionWithRaw(true, {}, 'yaml', 'Onglet B', getMarkdown, '');
		// Capture depuis Tiptap (flag non posé)
		expect(action.newRawContent).toContain('Markdown from Tiptap');
	});
});

describe('mode-sync — handleFrontmatterChangeAction', () => {
	it('frontmatter inchangé → null', () => {
		const result = handleFrontmatterChangeAction({}, 'yaml', 'Body');
		expect(result).not.toBeNull();
		// Deuxième appel avec le même frontmatter → null
		const result2 = handleFrontmatterChangeAction({}, 'yaml', 'Body');
		expect(result2).toBeNull();
	});

	it('frontmatter changé → newRawContent mis à jour', () => {
		handleFrontmatterChangeAction({ title: 'Old' }, 'yaml', '---\ntitle: Old\n---\n\nBody');
		const result = handleFrontmatterChangeAction({ title: 'New' }, 'yaml', '---\ntitle: Old\n---\n\nBody');
		expect(result).not.toBeNull();
		expect(result!.newRawContent).toContain('title: New');
		expect(result!.newRawContent).toContain('Body');
	});

	it('frontmatter vide mais body présent → rawContent sans FM', () => {
		handleFrontmatterChangeAction({ title: 'Test' }, 'yaml', '---\ntitle: Test\n---\n\nBody');
		const result = handleFrontmatterChangeAction({}, 'yaml', '---\ntitle: Test\n---\n\nBody');
		expect(result).not.toBeNull();
		expect(result!.newRawContent).not.toContain('title: Test');
		expect(result!.newRawContent).toContain('Body');
	});
});
