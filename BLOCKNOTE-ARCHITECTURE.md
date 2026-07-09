# BlockNote Architecture Reference

Package : `@blocknote/core` v0.51.4  
Dépendance : TipTap 3 / ProseMirror  
Licence : MPL-2.0 (core), GPL-3.0 (XL)

---

## 1. Vue d'ensemble

BlockNote est un éditeur **block-based** (type Notion) construit sur
ProseMirror / TipTap.  Il ajoute par-dessus une couche d'abstraction :

- **Blocks** — unités de contenu discrètes (paragraphe, heading, image,
  code, etc.), chacune avec son propre schéma de propriétés
- **Inline content** — le texte à l'intérieur d'un block (styled text,
  liens, custom inline)
- **Styles** — les attributs de formatage inline (bold, italic, color, etc.)
- **Schema** — le contrat qui définit quels blocks/inlines/styles sont
  disponibles dans un éditeur donné

L'architecture suit un modèle **manager-based** : chaque responsabilité
(blocs, événements, export, sélection, état, styles) est déléguée à un
manager dédié, injecté dans l'éditeur à la construction.

---

## 2. Core concepts

### Block

Unité fondamentale du document.  Structure :

```
Block {
  id: string
  type: string                    // "paragraph", "heading", "image", ...
  props: { [propName]: value }    // propriétés spécifiques au type
  content: InlineContent[]        // contenu inline (ou "none" / "table")
  children: Block[]               // imbrication (listes, toggle)
}
```

Chaque type de block est défini par un **BlockConfig** (le schéma) et une
**BlockImplementation** (le comportement : render DOM, parse, export).

**Types par défaut :**

| Type | content | Props remarquables |
|---|---|---|
| paragraph | inline | backgroundColor, textColor, textAlignment |
| heading | inline | level (1-6), isToggleable |
| bulletListItem | inline | idem |
| numberedListItem | inline | start |
| checkListItem | inline | checked |
| toggleListItem | inline | — |
| codeBlock | inline | language |
| quote | inline | — |
| divider | none | — |
| image | none | url, caption, previewWidth |
| video | none | url, caption |
| audio | none | url |
| file | none | url |
| table | table | — |

### InlineContent

Texte formaté à l'intérieur d'un block :

```
StyledText  → { type: "text",  text: string, styles: Styles }
Link        → { type: "link",  href: string, content: StyledText[] }
```

### Styles

Attributs de formatage inline :

```
{
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  code?: boolean
  textColor?: string
  backgroundColor?: string
}
```

Extensible via `StyleSchema`.

### Schema

Contrat typé qui définit blocks, inlines et styles disponibles :

```typescript
BlockNoteSchema.create({
  blockSpecs: { paragraph: ..., heading: ..., ... },
  inlineContentSpecs: { ... },
  styleSpecs: { ... }
})
```

`extend()` permet d'ajouter des specs supplémentaires avec inférence des
types composés.

---

## 3. Editor lifecycle

```
BlockNoteEditor.create(options)
  │
  ├── Managers : Block, Event, Export, Extension, Selection, State, Style
  ├── Extensions UI enregistrées
  ├── Schéma ProseMirror construit
  ├── TipTap créé (headless)
  └── Événement "create" émis
  │
editor.mount(domElement)
  │
  ├── contenteditable attaché au DOM
  ├── headless = false
  ├── Chaque extension reçoit mount() avec AbortSignal
  └── Événement "onMount" émis
  │
[utilisation]
  │
  ├── onChange  ← chaque transaction ProseMirror
  ├── onSelectionChange
  ├── onBeforeChange (peut annuler)
  ├── onMount / onUnmount
  └── editor.transact() / exec()
  │
editor.unmount()
  │
  ├── AbortSignal déclenché (extensions nettoyées)
  ├── Événement "onUnmount" émis
  └── TipTap détruit
```

### API publique

```typescript
// Création
BlockNoteEditor.create(options)

// Cycle de vie
editor.mount(element, { portalTarget? })
editor.unmount()

// Contenu
editor.document                          // Block[] actuel
editor.replaceBlocks(old, new)
editor.insertBlocks(blocks, target, "before"|"after"|"nested")
editor.updateBlock(id, { type, props, content })
editor.removeBlocks(ids)

// Curseur / sélection
editor.getTextCursorPosition()
editor.setTextCursorPosition(block, { placement })
editor.focus()

// Conversion
editor.blocksToMarkdownLossy(blocks?)
editor.blocksToFullHTML(blocks?)
editor.blocksToHTMLLossy(blocks?)
editor.tryParseMarkdownToBlocks(md)
editor.tryParseHTMLToBlocks(html)

// Événements
editor.onChange(cb)        → () => void (unsubscribe)
editor.onSelectionChange(cb)
editor.onMount(cb)         // via EventManager

// Extensions
editor.getExtension(key)   → Extension | undefined
editor.registerExtension(factory)
editor.unregisterExtension(key)

// État
editor.transact(fn)        // batch de mutations
editor.exec(command)
editor.undo() / editor.redo()
editor.isReady()           // true après mount
```

---

## 4. Extension system

### Interface

```typescript
Extension {
  key: string
  mount?: ({ dom, root, signal }) => void | OnDestroy
  store?: Store<State>                    // @tanstack/store
  prosemirrorPlugins?: Plugin[]
  inputRules?: InputRule[]
  keyboardShortcuts?: Record<string, fn>
  tiptapExtensions?: AnyExtension[]
  blockNoteExtensions?: ExtensionFactoryInstance[]
}
```

### Factory pattern

```typescript
// Factory : reçoit les options utilisateur → retourne une FactoryInstance
type ExtensionFactory<State, Key, Factory> = (opts?) => ExtensionFactoryInstance

// FactoryInstance : prend le contexte éditeur → retourne une Extension
type ExtensionFactoryInstance = (ctx) => Extension

// Helpers
createExtension(factory)   // crée une ExtensionFactory
createStore(initialState)  // crée un @tanstack/store
```

### Extensions UI intégrées

| Extension | Store expose | APIs |
|---|---|---|
| sideMenu | `SideMenuState \| undefined` | `blockDragStart`, `blockDragEnd` |
| formattingToolbar | `boolean` | — |
| suggestionMenu | `UiElementPosition & { query, triggerChar } \| undefined` | `addSuggestionMenu`, `openSuggestionMenu`, `closeMenu` |
| linkToolbar | — | `getLinkAtSelection`, `editLink`, `deleteLink` |
| filePanel | `string \| undefined` | `showMenu`, `closeMenu` |
| showSelection | `{ enabledSet: Set<string> }` | `showSelection(shouldShow, key)` |
| placeholder | — | (ProseMirror plugin) |

### Store pattern

Les extensions UI exposent leur état via `@tanstack/store`.
Souscription depuis n'importe quel framework :

```typescript
const store = editor.getExtension("sideMenu").store
store.subscribe((state) => { /* réagir */ })
```

---

## 5. UI element system

Chaque élément UI flottant (side menu, toolbar, suggestion menu, etc.)
suit le même pattern :

```
Extension (store)  ←→  View (DOM)
```

Le **store** contient l'état (`show`, `referencePos`, données
contextuelles).  La **View** est le DOM qui écoute le store et se
positionne selon `referencePos`.

Ce design permet de remplacer les Views React par des Views Svelte ou
vanilla sans toucher à la logique interne.

### UiElementPosition

```typescript
type UiElementPosition = {
  show: boolean
  referencePos: DOMRect    // rectangle de référence pour le positionnement
}

type SideMenuState = UiElementPosition & {
  block: Block
}
```

### SuggestionMenu

Le menu `/` (slash) est basé sur `SuggestionMenu` :

```typescript
editor.openSuggestionMenu("/")
editor.closeSuggestionMenu()

// Items par défaut
type DefaultSuggestionItem = {
  key: string
  title: string
  onItemClick: () => void
  subtext?: string
  badge?: string
  aliases?: string[]
  group?: string
}
```

---

## 6. Format conversion

### Markdown

**Import** (`tryParseMarkdownToBlocks`) :
```
Markdown string
  → markdownToHTML()        (conversion maison, pas unified/remark)
  → HTMLToBlocks()          (règles parse de chaque block)
  → Block[]
```

**Export** (`blocksToMarkdownLossy`) :
```
Block[]
  → externalHTMLExporter()  (toExternalHTML de chaque block → HTML simplifié)
  → cleanHTMLToMarkdown()   (html → markdown)
  → Markdown string
```

⚠️ **Lossy** : l'imbrication non-list-item est aplatie, certains styles
sont perdus.  Pour un round-trip fidèle, utiliser le JSON natif
(`editor.document`).

### HTML

- **Full HTML** (`blocksToFullHTML`) : utilise `render()` de chaque block
  → DOM complet identique à l'éditeur
- **Lossy HTML** (`blocksToHTMLLossy`) : utilise `toExternalHTML()` →
  HTML simplifié, plus standard
- **Import** (`tryParseHTMLToBlocks`) : règles `parse` + `parseContent`

### Recommandé pour le stockage

Le format natif **BlockNote JSON** (`editor.document`) est le seul garanti
lossless.  Markdown et HTML sont des formats d'**interopérabilité** avec
pertes possibles.

---

## 7. Integration points for Svelte

BlockNote est framework-agnostique.  Les points d'intégration Svelte :

| Point | Détail |
|---|---|
| Création | `BlockNoteEditor.create()` — vanilla, pas de dépendance framework |
| Montage | `editor.mount(div)` — attache le contenteditable à un élément DOM |
| Destruction | `editor.unmount()` — nettoyage complet |
| Store UI | `@tanstack/store` → wrapper `subscribe()` dans un `$effect` Svelte 5 |
| Toolbar | À implémenter en Svelte en appelant `editor.focus()` + `editor.exec()` |
| Side menu | Store → `blockDragStart`/`blockDragEnd` |
| Suggestion menu | Store → `openSuggestionMenu("/")` |
| Styles CSS | Importer `@blocknote/core/style.css` + Inter font |
| Markdown round-trip | `tryParseMarkdownToBlocks()` → édition → `blocksToMarkdownLossy()` |

### Composant Svelte minimal

```svelte
<script lang="ts">
  import { BlockNoteEditor } from "@blocknote/core"
  import "@blocknote/core/style.css"

  let { content, onChange } = $props()
  let container: HTMLDivElement
  let editor: BlockNoteEditor

  $effect(() => {
    editor = BlockNoteEditor.create({ initialContent: parseContent(content) })
    editor.mount(container)
    editor.onChange((ed) => onChange?.(ed.blocksToMarkdownLossy()))
    return () => editor.unmount()
  })
</script>

<div bind:this={container} />
```

---

## 8. Fichiers clés du package

| Chemin (dans `node_modules/@blocknote/core`) | Contenu |
|---|---|
| `types/src/index.d.ts` | Point d'entrée — re-exporte tout |
| `types/src/editor/BlockNoteEditor.d.ts` | Classe `BlockNoteEditor`, options |
| `types/src/editor/BlockNoteExtension.d.ts` | `Extension`, factories, store |
| `types/src/schema/schema.d.ts` | `CustomBlockNoteSchema` |
| `types/src/schema/blocks/types.d.ts` | `Block`, `PartialBlock`, `BlockConfig`, `BlockSpec` |
| `types/src/schema/inlineContent/types.d.ts` | `InlineContent`, `StyledText`, `Link` |
| `types/src/schema/styles/types.d.ts` | `StyleConfig`, `StyleSchema` |
| `types/src/blocks/defaultBlocks.d.ts` | `DefaultBlockSchema`, `DefaultInlineContentSchema` |
| `types/src/blocks/BlockNoteSchema.d.ts` | `BlockNoteSchema.create()`, `extend()` |
| `types/src/extensions/index.d.ts` | Toutes les extensions UI |
| `types/src/editor/managers/EventManager.d.ts` | Événements onChange/onSelectionChange |
| `types/src/editor/managers/BlockManager.d.ts` | CRUD des blocks |
| `types/src/editor/managers/ExportManager.d.ts` | Conversions HTML/Markdown |
| `types/src/api/exporters/markdown/markdownExporter.d.ts` | `blocksToMarkdown` |
| `types/src/api/parsers/markdown/parseMarkdown.d.ts` | `markdownToBlocks`, `markdownToHTML` |
| `types/src/api/parsers/html/parseHTML.d.ts` | `HTMLToBlocks` |
| `types/src/extensions-shared/UiElementPosition.d.ts` | `UiElementPosition` |
| `types/src/util/EventEmitter.d.ts` | `EventEmitter` typé |
