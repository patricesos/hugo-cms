import { describe, it, expect } from 'vitest';
import { validateSettingValue, allSettingKeys } from './validate';

describe('validateSettingValue', () => {
	describe('boolean fields', () => {
		const keys = ['defaultRawMode', 'showBubbleMenu', 'showSlashMenu', 'draftByDefault',
			'sidebarOpen', 'fmOpen', 'fmRawMode', 'showConsole', 'showPreview',
			'showGit', 'showFilenameInTabs', 'hugoSitePathUseDotEnv'];

		for (const key of keys) {
			it(`accepts true for "${key}"`, () => {
				const result = validateSettingValue(key, true);
				expect(result.valid).toBe(true);
				if (result.valid) expect(result.parsed).toBe(true);
			});

			it(`rejects string for "${key}"`, () => {
				const result = validateSettingValue(key, 'yes');
				expect(result.valid).toBe(false);
				if (!result.valid) expect(result.error).toContain('boolean');
			});
		}
	});

	describe('number fields', () => {
		it('accepts valid number for autoSaveDelay', () => {
			const result = validateSettingValue('autoSaveDelay', 2000);
			expect(result.valid).toBe(true);
			if (result.valid) expect(result.parsed).toBe(2000);
		});

		it('rejects number below min for autoSaveDelay', () => {
			const result = validateSettingValue('autoSaveDelay', 100);
			expect(result.valid).toBe(false);
		});

		it('rejects non-number for autoSaveDelay', () => {
			const result = validateSettingValue('autoSaveDelay', 'slow');
			expect(result.valid).toBe(false);
		});

		it('accepts valid port number for hugoPort', () => {
			const result = validateSettingValue('hugoPort', 1313);
			expect(result.valid).toBe(true);
		});

		it('rejects port below range for hugoPort', () => {
			const result = validateSettingValue('hugoPort', 0);
			expect(result.valid).toBe(false);
		});
	});

	describe('select fields', () => {
		it('accepts valid theme option', () => {
			const result = validateSettingValue('theme', 'dark');
			expect(result.valid).toBe(true);
			if (result.valid) expect(result.parsed).toBe('dark');
		});

		it('rejects invalid theme option', () => {
			const result = validateSettingValue('theme', 'ocean');
			expect(result.valid).toBe(false);
		});

		it('accepts valid editorFont option', () => {
			const result = validateSettingValue('editorFont', 'mono');
			expect(result.valid).toBe(true);
		});
	});

	describe('text fields', () => {
		const textKeys = ['gitRemote', 'gitBranch', 'hugoBindAddress', 'trashDir'];

		for (const key of textKeys) {
			it(`accepts string for "${key}"`, () => {
				const result = validateSettingValue(key, 'some-value');
				expect(result.valid).toBe(true);
				if (result.valid) expect(result.parsed).toBe('some-value');
			});

			it(`rejects number for "${key}"`, () => {
				const result = validateSettingValue(key, 42);
				expect(result.valid).toBe(false);
			});
		}
	});

	describe('folder fields', () => {
		it('accepts string for hugoSitePathCustom', () => {
			const result = validateSettingValue('hugoSitePathCustom', '/path/to/site');
			expect(result.valid).toBe(true);
		});

		it('accepts empty string for hugoSitePathCustom', () => {
			const result = validateSettingValue('hugoSitePathCustom', '');
			expect(result.valid).toBe(true);
		});
	});

	it('returns error for unknown key', () => {
		const result = validateSettingValue('nonexistent', true);
		expect(result.valid).toBe(false);
		if (!result.valid) expect(result.error).toContain('Unknown');
	});
});

describe('allSettingKeys', () => {
	it('returns all keys from schema', () => {
		const keys = allSettingKeys();
		expect(keys).toContain('theme');
		expect(keys).toContain('showGit');
		expect(keys).toContain('gitRemote');
		expect(keys).toContain('trashDir');
		expect(keys).toContain('cmsPort');
	});

	it('returns 29 keys matching UserSettings interface', () => {
		expect(allSettingKeys()).toHaveLength(29);
	});
});
