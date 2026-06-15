// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

vi.mock('@tiptap/core', () => {
	const noop = { configure: () => noop };
	const extension = { extend: () => extension, configure: () => extension };
	const mockInstance = {
		chain: () => ({ focus: () => ({ run: () => true }) }),
		storage: { markdown: { getMarkdown: () => '' } },
		state: { doc: { textContent: '' } },
		isActive: () => false,
		destroy: () => {},
		commands: { setContent: () => true },
		getHTML: () => '',
	};
	function MockEditor() { return mockInstance; }
	MockEditor.prototype = mockInstance;
	return {
		Editor: MockEditor as unknown as typeof import('@tiptap/core')['Editor'],
		Extension: { create: () => extension },
		Mark: { create: () => extension },
		Node: { create: () => extension },
		getExtensions: () => [],
		getSchema: () => ({}),
		getHTMLFromFragment: () => '',
	};
});

vi.mock('@tiptap/starter-kit', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-link', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-placeholder', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-bubble-menu', () => ({ default: { configure: () => ({}) } }));
vi.mock('tiptap-markdown', () => ({ Markdown: { configure: () => ({}) } }));

afterEach(cleanup);

describe('Editor', () => {
	it('renders toolbar with all buttons', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { content: 'Hello' });

		expect(container.querySelector('.editor-container')).toBeTruthy();
		expect(container.querySelector('.editor-toolbar')).toBeTruthy();

		const buttons = container.querySelectorAll('.editor-toolbar button');
		const labels = Array.from(buttons).map((b) => b.textContent?.trim());
		const expected = ['↩', '↪', 'H1', 'H2', 'H3', 'B', 'I', '</>', '🔗', '"', '•', '1.', '—'];
		for (const label of expected) {
			expect(labels.some((t) => t?.startsWith(label))).toBe(true);
		}
	});

	it('renders the bubble menu element', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { content: 'Test' });
		expect(container.querySelector('.bubble-menu')).toBeTruthy();
	});

	it('renders without error with empty content', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		render(Editor, {});
	});
});
