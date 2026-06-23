import { describe, it, expect } from 'vitest';
import { THEME_CATALOG } from './theme-catalog';

describe('THEME_CATALOG', () => {
	it('contains at least one theme', () => {
		expect(THEME_CATALOG.length).toBeGreaterThanOrEqual(1);
	});

	it('has unique IDs for every entry', () => {
		const ids = THEME_CATALOG.map((t) => t.id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it('every entry has required fields', () => {
		for (const entry of THEME_CATALOG) {
			expect(entry.id, `${entry.name}: id manquant`).toBeTruthy();
			expect(entry.name, `${entry.id}: name manquant`).toBeTruthy();
			expect(entry.repo, `${entry.id}: repo manquant`).toBeTruthy();
			expect(entry.description, `${entry.id}: description manquante`).toBeTruthy();
			expect(Array.isArray(entry.tags), `${entry.id}: tags doit être un tableau`).toBe(true);
			expect(entry.tags.length, `${entry.id}: au moins un tag`).toBeGreaterThanOrEqual(1);
			expect(Array.isArray(entry.providedShortcodes), `${entry.id}: providedShortcodes doit être un tableau`).toBe(true);
		}
	});

	it('all repo URLs are valid GitHub URLs', () => {
		for (const entry of THEME_CATALOG) {
			expect(entry.repo, `${entry.id}: repo URL invalide`).toMatch(
				/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/,
			);
		}
	});

	it('all IDs are valid directory names (no slashes, no spaces)', () => {
		for (const entry of THEME_CATALOG) {
			expect(entry.id, `${entry.id}: ID contient un slash`).not.toContain('/');
			expect(entry.id, `${entry.id}: ID contient un espace`).not.toContain(' ');
			expect(entry.id, `${entry.id}: ID vide`).not.toBe('');
		}
	});

	it('tags are non-empty strings', () => {
		for (const entry of THEME_CATALOG) {
			for (const tag of entry.tags) {
				expect(typeof tag, `${entry.id}: tag doit être une string`).toBe('string');
				expect(tag, `${entry.id}: tag vide`).not.toBe('');
			}
		}
	});
});
