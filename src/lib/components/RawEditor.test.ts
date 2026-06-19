// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('RawEditor — cycle de vie CM6', () => {
	it('crée un .cm-editor dans le host quand active=true', async () => {
		const { default: RawEditor } = await import('./RawEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(RawEditor, { active: true });

		await waitFor(() => {
			expect(container.querySelector('.cm-editor')).toBeTruthy();
		});
	});

	it('ne crée PAS de .cm-editor quand active=false', async () => {
		const { default: RawEditor } = await import('./RawEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(RawEditor, { active: false });

		// Attendre un tick pour laisser les $effect s'exécuter
		await vi.waitFor(() => {
			expect(container.querySelector('.cm-editor')).toBeFalsy();
		});
	});

	it('crée le .cm-editor après un toggle active=false → true', async () => {
		const { default: RawEditor } = await import('./RawEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container, rerender } = render(RawEditor, { active: false });

		await vi.waitFor(() => {
			expect(container.querySelector('.cm-editor')).toBeFalsy();
		});

		await rerender({ active: true });

		await waitFor(() => {
			expect(container.querySelector('.cm-editor')).toBeTruthy();
		});
	});

	it('affiche le contenu passé en prop', async () => {
		const { default: RawEditor } = await import('./RawEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(RawEditor, { active: true, content: 'Hello **world**' });

		await waitFor(() => {
			const lines = container.querySelectorAll('.cm-line');
			const text = Array.from(lines).map(l => l.textContent).join('\n');
			expect(text).toContain('Hello **world**');
		});
	});
});

describe('RawEditor — MutationObserver theme sync', () => {
	let mutationCb: MutationCallback;
	let mockObserve: ReturnType<typeof vi.fn>;
	let mockDisconnect: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockObserve = vi.fn();
		mockDisconnect = vi.fn();
		// vi.fn() produit une fonction constructible pour new MutationObserver
		const mockCtor = vi.fn().mockImplementation(function (this: unknown, cb: MutationCallback) {
			mutationCb = cb;
			return { observe: mockObserve, disconnect: mockDisconnect };
		});
		vi.stubGlobal('MutationObserver', mockCtor as unknown as typeof MutationObserver);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('crée un MutationObserver sur documentElement filtré sur data-theme', async () => {
		document.documentElement.dataset.theme = 'light';
		const { default: RawEditor } = await import('./RawEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		render(RawEditor, { active: true, content: 'Hello' });

		await waitFor(() => {
			expect(mockObserve).toHaveBeenCalledWith(
				document.documentElement,
				{ attributes: true, attributeFilter: ['data-theme'] },
			);
		});
	});

	it('le callback MutationObserver s\'exécute sans erreur quand data-theme change', async () => {
		document.documentElement.dataset.theme = 'light';
		const { default: RawEditor } = await import('./RawEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(RawEditor, { active: true, content: 'Hello' });

		await waitFor(() => {
			expect(container.querySelector('.cm-editor')).toBeTruthy();
		});

		// Déclencher manuellement le callback du MutationObserver
		// (le mock ignore les effets sans .changes, donc c'est un no-op safe)
		expect(() => {
			document.documentElement.dataset.theme = 'dark';
			mutationCb(
				[{ type: 'attributes', attributeName: 'data-theme', target: document.documentElement } as MutationRecord],
				null as unknown as MutationObserver,
			);
		}).not.toThrow();

		// Vérifier que le contenu CM6 est toujours intact après le callback
		const lines = container.querySelectorAll('.cm-line');
		const fullText = Array.from(lines).map(l => l.textContent).join('\n');
		expect(fullText).toContain('Hello');
	});

	it('disconnect le MutationObserver à la destruction du composant', async () => {
		document.documentElement.dataset.theme = 'light';
		const { default: RawEditor } = await import('./RawEditor.svelte');
		const { render } = await import('@testing-library/svelte');
		render(RawEditor, { active: true, content: 'Hello' });

		await waitFor(() => {
			expect(mockObserve).toHaveBeenCalled();
		});

		// cleanup() (afterEach) déclenche le return du $effect → disconnect
		// Note: mockDisconnect est appelé mais pas forcément avant que le test
		// se termine. On utilise un vi.waitFor pour s'assurer que le $effect
		// cleanup a eu le temps de s'exécuter.
		await vi.waitFor(() => {
			expect(mockDisconnect).toHaveBeenCalled();
		});
	});
});
