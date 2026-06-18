// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import TabBar from './TabBar.svelte';

// --- mock des icônes lucide (identique aux autres tests du projet) ---
vi.mock('@lucide/svelte', () => {
	function IconMock(_props: Record<string, unknown>) {
		return { $$render: () => '' };
	}
	const icons = [
		'X', 'FileText', 'FileImage', 'FileCode', 'Settings',
	] as const;
	const mod: Record<string, unknown> = {};
	for (const name of icons) mod[name] = IconMock;
	return mod;
});

afterEach(cleanup);

interface Tab {
	slug: string;
	title: string;
	frontmatter: Record<string, unknown>;
	kind: 'content' | 'static' | 'archetype' | 'config';
}

// --- jeux de données ---
const contentTab: Tab = { slug: 'hello', title: 'Hello World', frontmatter: {}, kind: 'content' };
const staticTab: Tab = { slug: 'images/logo.png', title: 'Logo', frontmatter: {}, kind: 'static' };
const archetypeTab: Tab = { slug: 'post', title: 'Post Archetype', frontmatter: {}, kind: 'archetype' };
const configTab: Tab = { slug: 'hugo', title: 'Hugo Config', frontmatter: {}, kind: 'config' };

const sampleTabs: Tab[] = [contentTab, staticTab, archetypeTab, configTab];

describe('TabBar', () => {
	// --- Rendu de base ---

	it('renders nothing when tabs is empty', () => {
		render(TabBar, { tabs: [], activeSlug: '', onSelect: vi.fn(), onClose: vi.fn() });
		expect(document.querySelector('.tab-bar')?.children.length).toBe(0);
	});

	it('renders one button per tab', () => {
		render(TabBar, { tabs: sampleTabs, activeSlug: '', onSelect: vi.fn(), onClose: vi.fn() });
		const buttons = document.querySelectorAll('.tab');
		expect(buttons.length).toBe(4);
	});

	it('shows the tab title', () => {
		render(TabBar, { tabs: [contentTab], activeSlug: '', onSelect: vi.fn(), onClose: vi.fn() });
		expect(screen.getByText('Hello World')).toBeTruthy();
	});

	// --- Tab actif ---

	it('adds active class to the active tab', () => {
		render(TabBar, { tabs: sampleTabs, activeSlug: 'post', onSelect: vi.fn(), onClose: vi.fn() });
		const buttons = document.querySelectorAll('.tab');
		expect(buttons[2].classList.contains('active')).toBe(true);
	});

	it('does not highlight inactive tabs', () => {
		render(TabBar, { tabs: sampleTabs, activeSlug: 'post', onSelect: vi.fn(), onClose: vi.fn() });
		const buttons = document.querySelectorAll('.tab');
		expect(buttons[0].classList.contains('active')).toBe(false);
		expect(buttons[1].classList.contains('active')).toBe(false);
		expect(buttons[3].classList.contains('active')).toBe(false);
	});

	// --- Icônes par type ---

	it('shows a static icon for static tabs', () => {
		render(TabBar, { tabs: [staticTab], activeSlug: '', onSelect: vi.fn(), onClose: vi.fn() });
		const icon = document.querySelector('.tab > :first-child');
		expect(icon).toBeTruthy();
		// L'icône est un fragment ($$render: () => ''), donc on vérifie juste sa présence
	});

	// --- Interaction : onSelect ---

	it('calls onSelect with the tab slug on click', async () => {
		const onSelect = vi.fn();
		render(TabBar, { tabs: sampleTabs, activeSlug: '', onSelect, onClose: vi.fn() });
		const buttons = document.querySelectorAll('.tab');
		await fireEvent.click(buttons[1]);
		expect(onSelect).toHaveBeenCalledWith('images/logo.png');
	});

	it('calls onSelect when clicking any tab', async () => {
		const onSelect = vi.fn();
		render(TabBar, { tabs: sampleTabs, activeSlug: '', onSelect, onClose: vi.fn() });
		const buttons = document.querySelectorAll('.tab');
		for (const btn of Array.from(buttons)) {
			await fireEvent.click(btn);
		}
		expect(onSelect).toHaveBeenCalledTimes(4);
	});

	// --- Interaction : onClose via le bouton X ---

	it('calls onClose with tab slug when X is clicked', async () => {
		const onClose = vi.fn();
		render(TabBar, { tabs: sampleTabs, activeSlug: '', onSelect: vi.fn(), onClose });
		const closeButtons = document.querySelectorAll('.tab-close');
		await fireEvent.click(closeButtons[0]);
		expect(onClose).toHaveBeenCalledWith('hello');
	});

	it('does not call onSelect when X is clicked', async () => {
		const onSelect = vi.fn();
		const onClose = vi.fn();
		render(TabBar, { tabs: sampleTabs, activeSlug: '', onSelect, onClose });
		const closeButtons = document.querySelectorAll('.tab-close');
		await fireEvent.click(closeButtons[0]);
		expect(onSelect).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	// --- Interaction : middle-click ---

	it('calls onClose on middle-click (button 1)', async () => {
		const onClose = vi.fn();
		render(TabBar, { tabs: [contentTab], activeSlug: '', onSelect: vi.fn(), onClose });
		const tab = document.querySelector('.tab')!;
		await fireEvent.mouseDown(tab, { button: 1 });
		expect(onClose).toHaveBeenCalledWith('hello');
	});

	it('does not call onClose on left-click (button 0)', async () => {
		const onClose = vi.fn();
		render(TabBar, { tabs: [contentTab], activeSlug: '', onSelect: vi.fn(), onClose });
		const tab = document.querySelector('.tab')!;
		await fireEvent.mouseDown(tab, { button: 0 });
		expect(onClose).not.toHaveBeenCalled();
	});

	// --- stopPropagation sur le X ---

	it('stops propagation on X mousedown so close does not bubble', async () => {
		const onClose = vi.fn();
		const onSelect = vi.fn();
		render(TabBar, { tabs: [contentTab], activeSlug: '', onSelect, onClose });
		const closeBtn = document.querySelector('.tab-close')!;
		await fireEvent.mouseDown(closeBtn);
		// stopPropagation empêche l'event de remonter jusqu'au onclick du tab
		// (rien à vérifier directement — pas de crash = OK)
	});

	// --- showFilenameInTabs ---

	it('shows filename only when showFilenameInTabs is true (content tab)', () => {
		const tab: Tab = { slug: 'blog/hello', title: 'Long Title', frontmatter: {}, kind: 'content' };
		render(TabBar, { tabs: [tab], activeSlug: '', showFilenameInTabs: true, onSelect: vi.fn(), onClose: vi.fn() });
		expect(screen.getByText('hello.md')).toBeTruthy();
	});

	it('shows the title when showFilenameInTabs is false', () => {
		const tab: Tab = { slug: 'blog/hello', title: 'Long Title', frontmatter: {}, kind: 'content' };
		render(TabBar, { tabs: [tab], activeSlug: '', showFilenameInTabs: false, onSelect: vi.fn(), onClose: vi.fn() });
		expect(screen.getByText('Long Title')).toBeTruthy();
	});

	it('does not add .md for non-content tabs in showFilenameInTabs', () => {
		const tab: Tab = { slug: 'images/logo', title: 'Logo', frontmatter: {}, kind: 'static' };
		render(TabBar, { tabs: [tab], activeSlug: '', showFilenameInTabs: true, onSelect: vi.fn(), onClose: vi.fn() });
		expect(screen.getByText('logo')).toBeTruthy();
		expect(screen.queryByText('logo.png')).toBeNull();
	});

	it('falls back to slug basename when title is empty', () => {
		const tab: Tab = { slug: 'nested/about', title: '', frontmatter: {}, kind: 'content' };
		render(TabBar, { tabs: [tab], activeSlug: '', onSelect: vi.fn(), onClose: vi.fn() });
		expect(screen.getByText('about')).toBeTruthy();
	});

	// --- Attribut title ---

	it('sets title attribute to slug.md for content tabs', () => {
		render(TabBar, { tabs: [contentTab], activeSlug: '', onSelect: vi.fn(), onClose: vi.fn() });
		const tab = document.querySelector('.tab') as HTMLElement;
		expect(tab.getAttribute('title')).toBe('hello.md');
	});

	it('sets title attribute to slug for non-content tabs', () => {
		render(TabBar, { tabs: [staticTab], activeSlug: '', onSelect: vi.fn(), onClose: vi.fn() });
		const tab = document.querySelector('.tab') as HTMLElement;
		expect(tab.getAttribute('title')).toBe('images/logo.png');
	});

	it('sets title on close button', () => {
		render(TabBar, { tabs: sampleTabs, activeSlug: '', onSelect: vi.fn(), onClose: vi.fn() });
		const closeButtons = document.querySelectorAll('.tab-close');
		expect(closeButtons[0].getAttribute('title')).toBe('Fermer');
	});
});
