// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import StatusBar from './StatusBar.svelte';
import { editorStore } from '$lib/stores/editor';

afterEach(() => {
	cleanup();
	editorStore.wordCount.set(0);
	editorStore.charCount.set(0);
});

describe('StatusBar', () => {
	it('renders word count and char count', () => {
		editorStore.wordCount.set(42);
		editorStore.charCount.set(200);
		render(StatusBar, { saveState: 'saved' });
		expect(screen.getByText(/42 mots/)).toBeTruthy();
		expect(screen.getByText(/200 caractères/)).toBeTruthy();
	});

	it('shows saved state', () => {
		editorStore.wordCount.set(0);
		editorStore.charCount.set(0);
		render(StatusBar, { saveState: 'saved' });
		expect(screen.getByText('Enregistré')).toBeTruthy();
	});

	it('shows unsaved state', () => {
		editorStore.wordCount.set(5);
		editorStore.charCount.set(30);
		render(StatusBar, { saveState: 'unsaved' });
		expect(screen.getByText(/non sauvegardées/)).toBeTruthy();
	});

	it('shows saving state', () => {
		editorStore.wordCount.set(0);
		editorStore.charCount.set(0);
		render(StatusBar, { saveState: 'saving' });
		expect(screen.getByText(/Sauvegarde/)).toBeTruthy();
	});

	it('displays zero counts', () => {
		editorStore.wordCount.set(0);
		editorStore.charCount.set(0);
		render(StatusBar, { saveState: 'saved' });
		expect(screen.getByText(/0 mots/)).toBeTruthy();
		expect(screen.getByText(/0 caractères/)).toBeTruthy();
	});
});
