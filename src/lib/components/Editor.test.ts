// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, waitFor } from '@testing-library/svelte';

// --- mock de @codemirror/view : CM6 ne peut pas tourner dans jsdom ---
// (pas de layout réel, pas de ResizeObserver constructible)
vi.mock('@codemirror/view', () => {
	const noopExt: unknown[] = [];
	class MockEditorView {
		static updateListener = { of: () => noopExt };
		static theme = () => noopExt;
		static inputHandler = { of: () => noopExt };
		static domEventHandlers = (handlers: Record<string, () => boolean>) => noopExt;
		dom: HTMLElement;
		state: MockState;
		contentDOM: HTMLElement;
		constructor(config: { state: MockState; parent: HTMLElement }) {
			this.state = config.state;
			const dom = document.createElement('div');
			dom.className = 'cm-editor';
			const scroller = document.createElement('div');
			scroller.className = 'cm-scroller';
			const content = document.createElement('div');
			content.className = 'cm-content';
			content.setAttribute('role', 'textbox');
			renderLines(content, this.state.doc.toString());
			scroller.appendChild(content);
			dom.appendChild(scroller);
			config.parent.appendChild(dom);
			this.dom = dom;
			this.contentDOM = content;
		}
		dispatch(tr?: { changes?: ChangeSpec | ChangeSpec[] }) {
			if (tr?.changes) {
				const changes = Array.isArray(tr.changes) ? tr.changes : [tr.changes];
				let text = this.state.doc.toString();
				for (const c of changes) {
					text = text.substring(0, c.from) + c.insert + text.substring(c.to);
				}
				this.state = makeMockState(text);
				renderLines(this.contentDOM, text);
			}
		}
		destroy() { this.dom.remove(); }
		focus() {}
	}

	interface MockState { doc: { toString: () => string; lineAt: (pos: number) => Line }; selection: { main: { from: number; to: number } } }
	interface Line { from: number; to: number; text: string }
	type ChangeSpec = { from: number; to: number; insert: string }
	function makeMockState(text: string): MockState {
		return {
			doc: {
				toString: () => text,
				lineAt: (_pos: number) => ({ from: 0, to: text.length, text }),
			},
			selection: { main: { from: 0, to: 0 } },
		};
	}
	function renderLines(container: HTMLElement, text: string) {
		container.innerHTML = '';
		for (const lineText of text.split('\n')) {
			const line = document.createElement('div');
			line.className = 'cm-line';
			line.textContent = lineText;
			container.appendChild(line);
		}
	}

	class MockDOMReader {}
	const __mockDOMReader = MockDOMReader;

	return {
		EditorView: MockEditorView as unknown as typeof import('@codemirror/view')['EditorView'],
		lineNumbers: () => noopExt,
		highlightActiveLineGutter: () => noopExt,
		highlightSpecialChars: () => noopExt,
		drawSelection: () => noopExt,
		dropCursor: () => noopExt,
		rectangularSelection: () => noopExt,
		crosshairCursor: () => noopExt,
		highlightActiveLine: () => noopExt,
		keymap: { of: () => noopExt },
	};
});

// --- mocks existants ---
vi.mock('@lucide/svelte', () => {
	function IconMock(_props: Record<string, unknown>) { return { $$render: () => '' }; }
	const icons = [
		'Undo2', 'Redo2', 'Heading1', 'Heading2', 'Heading3',
		'Bold', 'Italic', 'Code', 'Link', 'Quote',
		'List', 'ListOrdered', 'Minus', 'Pilcrow',
		'CheckCircle2', 'AlertCircle', 'Loader2', 'Type', 'Hash',
		'FileText', 'RefreshCw', 'ChevronRight', 'ArrowUp', 'Folder',
		'PanelRightOpen', 'PanelRightClose', 'PenLine',
		'X', 'Plus', 'AlertTriangle', 'Code2', 'Image', 'Zap',
	] as const;
	const mod: Record<string, unknown> = {};
	for (const name of icons) mod[name] = IconMock;
	return mod;
});

vi.mock('@tiptap/core', () => {
	const noop = { configure: () => noop };
	const extension = { extend: () => extension, configure: () => extension };
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

describe('Editor — WYSIWYG mode', () => {
	it('renders toolbar with all buttons', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { content: 'Hello' });

		expect(container.querySelector('.editor-container')).toBeTruthy();
		expect(container.querySelector('.editor-toolbar')).toBeTruthy();

		const buttons = container.querySelectorAll('.editor-toolbar button');
		const titles = Array.from(buttons).map((b) => b.getAttribute('title'));
		const expected = [
			'Annuler', 'Rétablir',
			'Titre 1', 'Titre 2', 'Titre 3',
			'Gras', 'Italique', 'Code', 'Lien',
			'Citation', 'Liste à puces', 'Liste numérotée', 'Ligne horizontale',
			'Mode Markdown brut',
		];
		for (const title of expected) {
			expect(titles.some((t) => t?.startsWith(title))).toBe(true);
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

	it('does NOT show CM6 editor host as active', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { content: 'Hello' });

		expect(container.querySelector('.cm-editor-host.active')).toBeFalsy();
	});
});

describe('Editor — mode brut / CM6', () => {
	it('renders CM6 editor host when rawMode=true', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { rawMode: true, content: 'Hello' });

		const host = container.querySelector('.cm-editor-host');
		expect(host).toBeTruthy();
		expect(host!.classList.contains('active')).toBe(true);
	});

	it('crée un .cm-editor dans le host', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { rawMode: true, content: '# Title\n\nBody' });

		await waitFor(() => {
			expect(container.querySelector('.cm-editor-host .cm-editor')).toBeTruthy();
		});
	});

	it('affiche le frontmatter sérialisé par défaut dans .cm-line', async () => {
		// rawContent est initialisé à '' ; le $effect frontmatter sérialise {}
		// en YAML et le préfixe. La CM6 doit donc montrer le frontmatter seul.
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { rawMode: true });

		await waitFor(() => {
			const lines = container.querySelectorAll('.cm-line');
			const fullText = Array.from(lines).map(l => l.textContent).join('\n');
			expect(fullText).toContain('---');
			expect(fullText).toContain('{}');
		});
	});

	it('sérialise le frontmatter passé dans la CM6', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, {
			rawMode: true,
			frontmatter: { title: 'Test', draft: true },
		});

		await waitFor(() => {
			const lines = container.querySelectorAll('.cm-line');
			const fullText = Array.from(lines).map(l => l.textContent).join('\n');
			expect(fullText).toContain('title: Test');
			expect(fullText).toContain('draft: true');
		});
	});

	it('conserve le body content quand rawMode=true dès le départ', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, {
			rawMode: true,
			content: 'Hello **world**',
			frontmatter: { title: 'Saved' },
		});

		await waitFor(() => {
			const lines = container.querySelectorAll('.cm-line');
			const fullText = Array.from(lines).map(l => l.textContent).join('\n');
			expect(fullText).toContain('Hello **world**');
			expect(fullText).toContain('title: Saved');
		});
	});

	it('affiche le bouton toggle avec "Mode visuel" en raw', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { rawMode: true });

		const toggle = Array.from(container.querySelectorAll('.editor-toolbar button'))
			.find(b => b.getAttribute('title') === 'Mode visuel');
		expect(toggle).toBeTruthy();
		expect(toggle!.classList.contains('toggle-active')).toBe(true);
	});

	it('a l\'aria-label "Contenu brut" sur le host', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { rawMode: true });

		const host = container.querySelector('.cm-editor-host');
		expect(host!.getAttribute('aria-label')).toBe('Contenu brut');
	});

	it('le bubble-menu existe toujours dans le DOM', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { rawMode: true });

		expect(container.querySelector('.bubble-menu')).toBeTruthy();
	});

	it('montre l\'éditeur visuel avec la classe active en WYSIWYG', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { rawMode: false, content: 'Hello' });

		expect(container.querySelector('.editor-content.active')).toBeTruthy();
	});

	it('cache l\'éditeur visuel en raw mode', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { rawMode: true });

		const editorContent = container.querySelector('.editor-content');
		expect(editorContent!.classList.contains('active')).toBe(false);
	});
});
