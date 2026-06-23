<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { EditorView } from "@codemirror/view";
    import {
        Compartment,
        EditorState,
        EditorSelection,
    } from "@codemirror/state";
    import { markdown } from "@codemirror/lang-markdown";
    import { getCmTheme } from "$lib/editor/codemirror-themes";
    import {
        undo,
        redo,
        history,
        defaultKeymap,
        historyKeymap,
        indentMore,
        indentLess,
    } from "@codemirror/commands";
    import {
        lineNumbers,
        highlightActiveLineGutter,
        highlightSpecialChars,
        drawSelection,
        dropCursor,
        rectangularSelection,
        crosshairCursor,
        highlightActiveLine,
        keymap,
    } from "@codemirror/view";
    import {
        foldGutter,
        indentOnInput,
        syntaxHighlighting,
        defaultHighlightStyle,
        bracketMatching,
        foldKeymap,
        indentUnit,
    } from "@codemirror/language";
    import {
        highlightSelectionMatches,
        searchKeymap,
    } from "@codemirror/search";
    import {
        closeBrackets,
        autocompletion,
        closeBracketsKeymap,
        completionKeymap,
    } from "@codemirror/autocomplete";
    import { lintKeymap } from "@codemirror/lint";

    function basicSetup(): import("@codemirror/state").Extension {
        return [
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            keymap.of([
                ...defaultKeymap,
                {
                    key: "Tab",
                    run: ({ state, dispatch }) => {
                        if (state.selection.ranges.some((r) => !r.empty))
                            return indentMore({ state, dispatch });
                        dispatch(
                            state.update(
                                state.replaceSelection(state.facet(indentUnit)),
                                { scrollIntoView: true, userEvent: "input" },
                            ),
                        );
                        return true;
                    },
                    shift: indentLess,
                },
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                ...closeBracketsKeymap,
                ...lintKeymap,
            ]),
        ];
    }

    interface RawEditorProps {
        content?: string;
        active?: boolean;
        onchange?: (content: string) => void;
    }

    let { content = "", active = false, onchange }: RawEditorProps = $props();

    let cmView = $state<EditorView | null>(null);
    let cmContainer = $state<HTMLDivElement | undefined>();
    let cmUpdating = false;

    // Cycle de vie CM6 : création quand actif, destruction quand inactif
    $effect(() => {
        if (!active || !cmContainer) {
            if (cmView) {
                console.log(
                    "[RawEditor] Destroy CM view (inactive/no container)",
                );
                cmView.destroy();
                cmView = null;
            }
            return;
        }
        const docContent = untrack(() => content);
        const isDark = document.documentElement.dataset.theme === "dark";
        console.log("[RawEditor] Create CM view", {
            contentLength: docContent.length,
            isDark,
        });
        const tc = new Compartment();
        const view = new EditorView({
            state: EditorState.create({
                doc: docContent,
                extensions: [
                    basicSetup(),
                    markdown(),
                    tc.of(getCmTheme(isDark)),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged && !cmUpdating) {
                            onchange?.(update.state.doc.toString());
                        }
                    }),
                    EditorView.theme({
                        "&": { height: "100%" },
                        ".cm-scroller": {
                            overflow: "auto",
                            fontFamily: "inherit",
                        },
                        ".cm-content": {
                            padding: "24px 32px",
                            fontFamily: "var(--editor-font, var(--font-mono))",
                            fontSize: "var(--editor-font-size, 14px)",
                        },
                    }),
                ],
            }),
            parent: cmContainer,
        });
        cmView = view;

        // Observe data-theme sur <html> → reconfigure le thème CM6 sans destroy
        const themeObs = new MutationObserver(() => {
            view.dispatch({
                effects: [
                    tc.reconfigure(
                        getCmTheme(
                            document.documentElement.dataset.theme === "dark",
                        ),
                    ),
                ],
            });
        });
        themeObs.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        return () => {
            console.log("[RawEditor] Cleanup: destroy CM view");
            themeObs.disconnect();
            view.destroy();
            if (cmView === view) cmView = null;
        };
    });

    // Sync externe : quand content change depuis l'orchestrateur (frontmatter, tab switch), pousser vers CM6
    $effect(() => {
        if (!cmView || cmUpdating) return;
        const current = cmView.state.doc.toString();
        const shouldSync = current !== content;
        console.log("[RawEditor] Sync $effect", {
            currentLen: current.length,
            contentLen: content?.length,
            shouldSync,
            cmUpdating,
        });
        if (shouldSync) {
            console.log("[RawEditor] DISPATCHING sync", {
                from: 0,
                to: current.length,
                insertLen: content?.length,
            });
            cmUpdating = true;
            cmView.dispatch({
                changes: { from: 0, to: current.length, insert: content },
            });
            cmUpdating = false;
        }
    });

    export function cmDispatch(
        changes: { from: number; to: number; insert: string }[],
        selectionPos?: number,
    ) {
        if (!cmView) return;
        cmView.dispatch({
            changes: changes.map((c) => ({
                from: c.from,
                to: c.to,
                insert: c.insert,
            })),
            ...(selectionPos !== undefined
                ? { selection: EditorSelection.cursor(selectionPos) }
                : {}),
        });
        cmView.focus();
    }

    export function rawWrap(prefix: string, suffix: string) {
        if (!cmView) return;
        const sel = cmView.state.selection.main;
        const start = sel.from;
        const end = sel.to;
        const text = cmView.state.doc.toString();
        const selected = text.substring(start, end);
        const wrapped = selected
            ? `${prefix}${selected}${suffix}`
            : `${prefix}${suffix}`;
        cmDispatch(
            [{ from: start, to: end, insert: wrapped }],
            selected ? start : start + prefix.length,
        );
    }

    export function rawWrapInner(text: string) {
        if (!cmView) return;
        const pos = cmView.state.selection.main.from;
        cmDispatch([{ from: pos, to: pos, insert: text }], pos + text.length);
    }

    export function rawHeading(level: number) {
        if (!cmView) return;
        const pos = cmView.state.selection.main.from;
        const doc = cmView.state.doc;
        const line = doc.lineAt(pos);
        const lineText = line.text;
        const prefix = "#".repeat(level) + " ";
        const stripped = lineText.replace(/^#{1,6}\s*/, "");
        const newLine = `${prefix}${stripped}`;
        cmDispatch(
            [{ from: line.from, to: line.to, insert: newLine }],
            line.from + prefix.length,
        );
    }

    export function rawList(ordered: boolean) {
        if (!cmView) return;
        const pos = cmView.state.selection.main.from;
        const doc = cmView.state.doc;
        const line = doc.lineAt(pos);
        const lineText = line.text;
        const stripped = lineText.replace(/^(\s*)(\d+\.\s|[-*+]\s)/, "$1");
        const prefix = ordered ? "1. " : "- ";
        const indent = stripped.match(/^\s*/)?.[0] || "";
        const content = stripped.replace(/^\s*/, "");
        const result = content
            ? `${indent}${prefix}${content}`
            : `${indent}${prefix}`;
        cmDispatch(
            [{ from: line.from, to: line.to, insert: result }],
            line.from + result.length,
        );
    }

    export function rawBlockquote() {
        if (!cmView) return;
        const pos = cmView.state.selection.main.from;
        const doc = cmView.state.doc;
        const line = doc.lineAt(pos);
        const lineText = line.text;
        const newLine = lineText.startsWith("> ")
            ? lineText.slice(2)
            : `> ${lineText}`;
        cmDispatch(
            [{ from: line.from, to: line.to, insert: newLine }],
            line.from + newLine.length,
        );
    }

    export function rawLink() {
        const url = window.prompt("URL du lien:");
        if (!url) return;
        rawWrap("[", `](${url})`);
    }

    export function rawHr() {
        if (!cmView) return;
        const pos = cmView.state.selection.main.from;
        const doc = cmView.state.doc.toString();
        const before = doc.substring(0, pos);
        const nl = before.endsWith("\n") || before === "" ? "" : "\n";
        const insert = `${nl}---\n\n`;
        cmDispatch([{ from: pos, to: pos, insert }], pos + insert.length);
    }

    export function rawUndo() {
        if (cmView) {
            undo(cmView);
            return;
        }
    }

    export function rawRedo() {
        if (cmView) {
            redo(cmView);
            return;
        }
    }

    export function focus() {
        cmView?.focus();
    }
</script>

<div
    bind:this="{cmContainer}"
    class="cm-editor-host"
    class:active
    role="textbox"
    aria-label="Contenu brut"
></div>

<style>
    .cm-editor-host {
        flex: 1;
        width: 100%;
        overflow: hidden;
        border: none;
        outline: none;
        display: none;
    }

    .cm-editor-host.active {
        display: block;
    }

    .cm-editor-host :global(.cm-editor) {
        height: 100%;
    }

    .cm-editor-host :global(.cm-editor.cm-focused) {
        outline: none;
    }
</style>
