// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, waitFor } from '@testing-library/svelte';

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

	interface MockState { doc: { toString: () => string; lineAt: (pos: number) => Line }; selection: { main: { from: number; to: number } } };
	interface Line { from: number; to: number; text: string };
	type ChangeSpec = { from: number; to: number; insert: string };
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

afterEach(cleanup);

describe('RawEditor', () => {
	it('crée un .cm-editor dans le host quand active=true', async () => {
		const { default: RawEditor } = await import('./RawEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(RawEditor, { active: true, content: '# Title\n\nBody' });

		await waitFor(() => {
			expect(container.querySelector('.cm-editor-host .cm-editor')).toBeTruthy();
		});
	});

	it('a l\'aria-label "Contenu brut"', async () => {
		const { default: RawEditor } = await import('./RawEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(RawEditor, { active: true });

		const host = container.querySelector('.cm-editor-host');
		expect(host!.getAttribute('aria-label')).toBe('Contenu brut');
	});
});
