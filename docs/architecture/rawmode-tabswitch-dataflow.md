# RawMode ↔ Tab Switch Dataflow

## Problème

Quand l'utilisateur toggles `rawMode` (Ctrl+R ou bouton `</>` dans la toolbar)
puis clique sur un autre onglet, l'éditeur peut afficher un contenu corrompu
(double frontmatter) ou ne pas se mettre à jour. Ce document trace le flux
complet et identifie les causes racines.

---

## Architecture du rawMode

### Local override — pas de propagation au parent

```ts
// Editor.svelte:78
let { rawMode = false }: EditorProps = $props();
```

```ts
// Editor.svelte:634
<button onclick={() => rawMode = !rawMode} title="Mode Markdown brut">
```

Le toggle `rawMode = !rawMode` (l.606/634) est un **local override** — il mute
la variable `$props()` locale sans remonter au parent. La valeur du parent
(`$settings.defaultRawMode`) ne change pas.

**Conséquence** : le rawMode survit à un changement d'onglet tant que le parent
passe la même valeur `rawMode={$settings.defaultRawMode}`.

### Deux éditeurs, un seul actif

| Mode | Éditeur | Contenu stocké |
|------|---------|----------------|
| WYSIWYG | Tiptap (`editor`) | `getMarkdown()` = body sans frontmatter |
| Raw | CodeMirror 6 (`cmView`) | `rawContent` = frontmatter + body |

---

## Flux : toggle rawMode (Ctrl+R)

```
1. Ctrl+R → handleKeydown (l.604-607)
   → rawMode = !rawMode
2. Svelte flush → $effect(rawMode) (l.293-311)
3a. Si passage en rawMode :
    - getMarkdown() ou content → body
    - serializeFm(frontmatter) → fm string
    - rawContent = fm + "\n\n" + body
    - CM6 créé + affiché
3b. Si passage en WYSIWYG :
    - splitRawContent(rawContent) → body
    - editor.commands.setContent(body)
    - Tiptap affiché
4. prevRawMode = rawMode  ← guarde le prochain $effect
```

**Invariant** : le `$effect(rawMode)` se déclenche UNE SEULE FOIS par toggle
grâce au guard `if (rawMode === prevRawMode) return`.

---

## Flux : switchToTab depuis rawMode (le bug)

### Étape 1 : sauvegarde du tab sortant

```ts
// editor.svelte.ts:128-136
if (tab.kind === 'content') {
    if (_editorGetContent) {
        const savedContent = _editorGetContent();
        // ...
        tabs.update(t => t.map(ti =>
            ti.slug === curSlug && ti.kind === 'content'
                ? { ...ti, content: savedContent, frontmatter: savedFm }
                : ti
        ));
    }
```

```ts
// Editor.svelte:256 (dans onMount)
getContent?.(() => rawMode ? rawContent : getMarkdown());
//                              ^^^^^^^^^
//       rawContent = frontmatter + body (texte complet CM6)
```

⚠️ **En rawMode, `_editorGetContent()` retourne `rawContent`** — qui contient
**déjà le frontmatter** (ex: `---\ntitle: Mon Article\n---\n\nContenu...`).

Ce texte complet est sauvé dans `tab.content`.

### Étape 2 : chargement du tab entrant

```ts
// editor.svelte.ts:138-141
currentSlug.set(tab.slug);
editorContent.set(tab.content);   // ← contient frontmatter + body
currentFrontmatter.set({ ...tab.frontmatter });
```

### Étape 3 : `$effect(content)` dans Editor.svelte

```ts
// Editor.svelte:279-291
$effect(() => {
    if (content === prevContent) return;
    prevContent = content;
    if (rawMode) {
        const fmString = serializeFm(frontmatter, frontmatterFormat);
        const newContent = fmString ? `${fmString}\n\n${content}` : content;
        if (rawContent !== newContent) rawContent = newContent;
        //                        ^^^^^^^^
        // rawContent = newContent = fm + "\n\n" + (fm + body)
        //                          ▲              ▲
        //                          frontmatter    tab.content qui contient DÉJÀ fm+body
    }
});
```

🔴 **DOUBLE FRONTMATTER** : `content` vaut déjà `fm + "\n\n" + body`
(parce que `tab.content` a été sauvé depuis `rawContent` à l'étape 1).
Le `$effect` re-sérialise le frontmatter et le prépende → `rawContent = fm + fm + body`.

### Étape 4 : le guard `rawContent !== newContent`

Le guard **rate** si `rawContent` n'est pas égal à `newContent` — mais dans ce
cas, `rawContent` contient l'ancien contenu (du tab précédent) et `newContent`
contient `fm + (fm + body)`. La condition est vraie → **l'assignation se fait**.

---

## Flux : switchToTab depuis WYSIWYG (correct)

### Étape 1 : sauvegarde du tab sortant

```ts
getContent?.(() => rawMode ? rawContent : getMarkdown());
//                                        ^^^^^^^^^^^^
//    getMarkdown() = body sans frontmatter
```

`tab.content = body` — propre, pas de frontmatter.

### Étape 2 : chargement du tab entrant

Même code, mais `tab.content = body` (sauvé proprement avant).

### Étape 3 : `$effect(content)` — cas WYSIWYG

```ts
// Editor.svelte:288-289
} else if (editor) {
    editor.commands.setContent(protectShortcodes(content));
    // content = body → setContent(body) → correct
}
```

✅ Propre — pas de double frontmatter.

---

## Résumé

| Scénario | `_editorGetContent()` retourne | `tab.content` | `$effect(content)` | Résultat |
|----------|-------------------------------|---------------|-------------------|----------|
| Switch depuis WYSIWYG | `getMarkdown()` (body) | `body` | `setContent(body)` | ✅ |
| Switch depuis rawMode | `rawContent` (fm+body) | `fm + "\n\n" + body` | re-prepend fm → `fm + fm + body` | 🔴 Double fm |
| Toggle rawMode (même tab) | N/A (pas de save) | inchangé | `$effect(rawMode)` gère la fusion | ✅ |

---

## Diagramme PlantUML

```plantuml
@startuml
skinparam monochrome true
skinparam rectangle {
  BorderColor black
  FontColor black
}

rectangle "Editor.svelte\n(instance unique)" as Editor {
  rectangle "rawMode\n$props() local" as RawMode
  rectangle "$effect(content)" as EffContent
  rectangle "$effect(rawMode)" as EffRawMode
  rectangle "getContent?.(() => rawMode\n  ? rawContent\n  : getMarkdown())" as GetContent
  rectangle "buildEditor()\nTiptap" as Tiptap
  rectangle "CM6\nraw editor" as CM6
  rectangle "rawContent\n$state" as RawContent
}

rectangle "editorStore\nswitchToTab()" as SwitchToTab {
  rectangle "_editorGetContent?.()" as CallGet
  rectangle "tab.content = savedContent" as SaveTab
  rectangle "editorContent\n.set(tab.content)" as SetEdContent
  rectangle "currentSlug.set()" as SetSlug
}

rectangle "Tab A" as TabA
rectangle "Tab B" as TabB

== Raw Mode: Save & Switch ==

RawMode --> GetContent : rawMode = true
SwitchToTab --> CallGet
CallGet --> GetContent : _editorGetContent()
GetContent --> CallGet : returns rawContent\n(= frontmatter + body)
CallGet --> SaveTab : tab.content = frontmatter + body
SwitchToTab --> SetEdContent : editorContent.set(tab.content)
SetEdContent --> EffContent : content prop changes

note right of EffContent
  $effect(content):
  content !== prevContent
  → rawMode? → merge fm + content
  → rawContent !== newContent?
    → rawContent = newContent
    ⚠️ frontmatter is prepended AGAIN
    → double frontmatter!
end note

EffContent --> RawContent : rawContent = fm + (fm + body)

== WYSIWYG Mode: Save & Switch ==

RawMode --> GetContent : rawMode = false
SwitchToTab --> CallGet : _editorGetContent()
GetContent --> CallGet : returns getMarkdown()\n(= body only)
CallGet --> SaveTab : tab.content = body
SwitchToTab --> SetEdContent : editorContent.set(body)
SetEdContent --> EffContent : content prop changes

note right of TabB
  $effect(content):
  body !== prevContent
  → !rawMode → editor.commands
    .setContent(body)
  ✅ clean, no duplication
end note

legend top
  Le bug frontmatter double :
  switchToTab depuis rawMode
  sauvegarde rawContent (fm+body)
  dans tab.content, puis le
  $effect(content) re-prépende
  le frontmatter → doublon.
  Switch depuis WYSIWYG :
  getMarkdown() retourne body
  seul → tab.content propre.
endlegend

@enduml
```

---

## Correction possible

Deux approches :

### Approche A : Nettoyer `tab.content` au save

Dans `switchToTab`, avant de sauvegarder `tab.content`, extraire le body :

```ts
// editor.svelte.ts — dans switchToTab, autour de la ligne 130
if (_editorGetContent) {
    const savedContent = _editorGetContent();
    // Si on est en raw mode, savedContent contient frontmatter + body
    // → on veut sauvegarder seulement le body dans tab.content
    const savedFm = { ...get(currentFrontmatter) };
    tabs.update(t => t.map(ti =>
        ti.slug === curSlug && ti.kind === 'content'
            ? { ...ti, content: savedContent, frontmatter: savedFm }
            : ti
    ));
}
```

**Problème** : `switchToTab` ne sait pas si l'éditeur est en rawMode — ce flag
est local à `Editor.svelte`. Il faudrait soit :
- Exposer `rawMode` dans le store (remonter l'état)
- Ou splitter `savedContent` dans `switchToTab` en détectant le frontmatter

### Approche B : Storer body seulement dans le getter

Modifier le getter pour toujours retourner le body, même en rawMode :

```ts
// Editor.svelte, ligne 256
getContent?.(() => rawMode ? getRawBody(rawContent) : getMarkdown());
//                        ^^^^^^^^^^^^^^^^^^^^^^^^^
//            Toujours du body, jamais frontmatter + body
```

**Problème** : d'autres appelants de `getContent` (ex: `_editorGetContent`
pour sauvegarde via `handleSave`) pourraient dépendre du comportement actuel.
Mais `handleSave` ne passe pas par `_editorGetContent` — il utilise `rawContent`
directement à travers `onSave` et `doRawAutoSave`.

**Cette approche est la plus propre** : elle garantit que `tab.content` ne
contient **jamais** de frontmatter, quel que soit le mode de l'éditeur.

---

## Invariants (à préserver)

1. **`tab.content` ne contient que le body**, jamais le frontmatter.
   - Vérifié au chargement depuis l'API (`data.body`)
   - Vérifié au reload depuis disque (`data.body`)
   - **Non vérifié** au save depuis l'éditeur en rawMode ← le bug

2. **Le frontmatter est toujours dans `tab.frontmatter`**, jamais dans `tab.content`.

3. **`rawContent` (état local de Editor.svelte) = frontmatter + body** —
   c'est le seul endroit où la fusion existe. À ne pas propager dans le store.

4. **`getMarkdown()` retourne toujours le body sans frontmatter** —
   `tiptap-markdown` ne connaît pas le frontmatter.

---

## Fichiers

| Fichier | Lignes clés | Rôle |
|---------|-------------|------|
| `src/lib/components/Editor.svelte` | 78, 256, 279-311, 604-607, 634 | rawMode local, getter, effets, toggle |
| `src/lib/stores/editor.svelte.ts` | 123-148 | `switchToTab` : save + load tab.content |
| `src/lib/components/Editor.svelte` | 103-106, 414-450 | `getMarkdown()`, `splitRawContent()`, `getRawBody()` |
| `src/routes/+page.svelte` | 560-588 | Passage de `rawMode={$settings.defaultRawMode}` |
