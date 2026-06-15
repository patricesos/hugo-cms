// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import StatusBar from './StatusBar.svelte';

afterEach(cleanup);

describe('StatusBar', () => {
	it('renders word count and char count', () => {
		render(StatusBar, { wordCount: 42, charCount: 200, saveState: 'saved' });
		expect(screen.getByText(/42 mots/)).toBeTruthy();
		expect(screen.getByText(/200 caractères/)).toBeTruthy();
	});

	it('shows saved state', () => {
		render(StatusBar, { wordCount: 0, charCount: 0, saveState: 'saved' });
		expect(screen.getByText(/✓/)).toBeTruthy();
	});

	it('shows unsaved state', () => {
		render(StatusBar, { wordCount: 5, charCount: 30, saveState: 'unsaved' });
		expect(screen.getByText(/non sauvegardées/)).toBeTruthy();
	});

	it('shows saving state', () => {
		render(StatusBar, { wordCount: 0, charCount: 0, saveState: 'saving' });
		expect(screen.getByText(/Sauvegarde/)).toBeTruthy();
	});

	it('displays zero counts', () => {
		render(StatusBar, { wordCount: 0, charCount: 0, saveState: 'saved' });
		expect(screen.getByText('0 mots · 0 caractères')).toBeTruthy();
	});
});
