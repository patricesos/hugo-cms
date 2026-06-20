// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

vi.mock('@lucide/svelte', () => {
	function IconMock() { return { $$render: () => '' }; }
	return { Bold: IconMock, Code: IconMock, Italic: IconMock, Link: IconMock };
});

vi.mock('@tiptap/core', () => {
	const mockInstance = {
		chain: () => ({ focus: () => ({ run: () => true }) }),
		storage: { markdown: { getMarkdown: () => '' } },
		state: { doc: { textContent: '' } },
		isActive: () => false,
		isDestroyed: false,
		destroy: () => {},
		commands: { setContent: () => true },
		getHTML: () => '',
		view: { dom: { addEventListener: () => {}, removeEventListener: () => {} } },
	};
	function MockEditor() { return mockInstance; }
	MockEditor.prototype = mockInstance;
	const extension = { extend: () => extension, configure: () => extension };
	return {
		Editor: MockEditor as unknown as typeof import('@tiptap/core')['Editor'],
		Extension: { create: () => extension },
	};
});

vi.mock('@tiptap/starter-kit', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-placeholder', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-image', () => ({ default: { configure: () => ({}), extend: () => ({ addStorage: () => ({}) }) } }));
vi.mock('tiptap-markdown', () => ({ Markdown: { configure: () => ({}) } }));
vi.mock('$lib/editor/slash-commands', () => ({ SlashCommands: {} }));
vi.mock('$lib/shortcode-utils', () => ({ protectShortcodes: (s: string) => s }));

afterEach(cleanup);

describe('WysiwygEditor', () => {
	it('renders the bubble menu element', async () => {
		const { default: WysiwygEditor } = await import('./WysiwygEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(WysiwygEditor, { active: true, content: 'Test' });
		expect(container.querySelector('.bubble-menu')).toBeTruthy();
	});

	it('montre .editor-content.active quand active=true', async () => {
		const { default: WysiwygEditor } = await import('./WysiwygEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(WysiwygEditor, { active: true, content: 'Hello' });
		expect(container.querySelector('.editor-content.active')).toBeTruthy();
	});

	it('cache .editor-content quand active=false', async () => {
		const { default: WysiwygEditor } = await import('./WysiwygEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(WysiwygEditor, { active: false, content: 'Hello' });
		const editorContent = container.querySelector('.editor-content');
		expect(editorContent!.classList.contains('active')).toBe(false);
	});
});
