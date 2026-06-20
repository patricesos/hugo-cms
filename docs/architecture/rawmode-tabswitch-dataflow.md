# RawMode ↔ Tab Switch Dataflow

## Problème (résolu — commit 5588068)

Quand l'utilisateur toggles `rawMode` (Ctrl+R ou bouton `</>` dans la toolbar)
puis clique sur un autre onglet, l'éditeur pouvait afficher un contenu corrompu
(double frontmatter) ou ne pas se mettre à jour.

**Cause racine** : en rawMode, `_editorGetContent()` retournait `rawContent`
(frontmatter + body) au lieu du body seul → `tab.content` contenait le
frontmatter → au retour sur l'onglet, le `$effect` le re-prépenait →
**double frontmatter**.

**Fix** (Approche B du document original) : le getter utilise désormais
`getRawBody(rawContent)` qui extrait le body seul, même en rawMode.
`tab.content` ne contient **jamais** de frontmatter, quel que soit le mode.

---

## Architecture du rawMode

### Local override — pas de propagation au parent

```ts
// Editor.svelte:33
let { rawMode = false }: EditorProps = $props();
```

```ts
// Editor.svelte:330
<button onclick={() => rawMode = !rawMode} title="Mode Markdown brut">
```

Le toggle `rawMode = !rawMode` (l.330) est un **local override** — il mute
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
1. Ctrl+R → handleKeydown (l.226-228)
   → rawMode = !rawMode
2. Svelte flush → coordination $effect (l.257-285)
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

## Flux : switchToTab depuis rawMode (le bug ❌ → ✅ fixé)

### Étape 1 : sauvegarde du tab sortant

```ts
// editor.svelte.ts:128-136
if (tab.kind === 'content') {
    if (_editorGetContent) {
        const savedContent = _editorGetContent();  // ← getRawBody() extrait body seul
        // ...
        tabs.update(t => t.map(ti =>
            ti.slug === curSlug && ti.kind === 'content'
                ? { ...ti, content: savedContent, frontmatter: savedFm }
                : ti
        ));
    }
```

```ts
// Editor.svelte:241 (dans onMount)
getContent?.(() => rawMode ? getRawBody(rawContent) : getMarkdown());
//                          ^^^^^^^^^^^^^^^^^^^^^^^^^
//       getRawBody(rawContent) = body extrait via splitRawContent()
```

✅ **Depuis le fix** : même en rawMode, `_editorGetContent()` retourne du **body seul**.
`splitRawContent()` détecte YAML (`---...---`) ou TOML (`+++...+++`), extrait le body,
et retourne le reste. `tab.content` ne contient jamais de frontmatter.

### Étape 2 : chargement du tab entrant

```ts
// editor.svelte.ts:138-141
currentSlug.set(tab.slug);
editorContent.set(tab.content);   // ← body seulement
currentFrontmatter.set({ ...tab.frontmatter });
```

### Étape 3 : coordination `$effect` dans Editor.svelte

```ts
// Editor.svelte:257-285
$effect(() => {
    if (!sync) return;
    if (content === prevContent && rawMode === prevRawMode) return;
    // ...
});
```

✅ `content` vaut `body` (propre, sans frontmatter). Le `$effect` gère la fusion
frontmatter + body proprement si on est en rawMode, ou `setContent(body)` si
on est en WYSIWYG. Plus de double frontmatter.

---

## Flux : switchToTab depuis WYSIWYG (correct)

### Étape 1 : sauvegarde du tab sortant

```ts
getContent?.(() => rawMode ? getRawBody(rawContent) : getMarkdown());
//                                        ^^^^^^^^^^^^
//    getMarkdown() = body sans frontmatter
```

`tab.content = body` — propre, pas de frontmatter.

### Étape 2 : chargement du tab entrant

Même code, mais `tab.content = body` (sauvé proprement avant).

### Étape 3 : coordination `$effect` — cas WYSIWYG

```ts
// Editor.svelte:257-285 (coordination $effect)
...
} else if (wysiwygEditor) {
    wysiwygEditor.commands.setContent(protectShortcodes(content));
    // content = body → setContent(body) → correct
}
```

✅ Propre — pas de double frontmatter.

---

## Résumé (après fix)

| Scénario | `_editorGetContent()` retourne | `tab.content` | Résultat |
|----------|-------------------------------|---------------|----------|
| Switch depuis WYSIWYG | `getMarkdown()` (body) | `body` | ✅ |
| Switch depuis rawMode | `getRawBody(rawContent)` (body) | `body` | ✅ |
| Toggle rawMode (même tab) | N/A (pas de save) | inchangé | ✅ |
| **Avant le fix** : switch depuis rawMode | ~~`rawContent` (fm+body)~~ | ~~`fm+body`~~ | ~~🔴 Double fm~~ |

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
  rectangle "coordination $effect\ncontent + rawMode" as EffCoord
  rectangle "getContent?.(() => rawMode\n  ? getRawBody(rawContent)\n  : getMarkdown())" as GetContent #77FF77
  rectangle "buildEditor()\nTiptap" as Tiptap
  rectangle "CM6\nraw editor" as CM6
  rectangle "rawContent\n$state (fm+body)" as RawContent
}

rectangle "editorStore\nswitchToTab()" as SwitchToTab {
  rectangle "_editorGetContent?.()" as CallGet
  rectangle "tab.content = savedContent" as SaveTab
  rectangle "editorContent\n.set(tab.content)" as SetEdContent
  rectangle "currentSlug.set()" as SetSlug
}

== Switch depuis n'importe quel mode ==

RawMode --> GetContent : rawMode = true/false
SwitchToTab --> CallGet
CallGet --> GetContent : _editorGetContent()
GetContent --> CallGet : retourne TOUJOURS\nle body seul
CallGet --> SaveTab : tab.content = body (propre)
SwitchToTab --> SetEdContent : editorContent.set(body)
SetEdContent --> EffCoord : content prop change

note right of GetContent #77FF77
  ✅ Fix appliqué (commit 5588068) :
  getContent utilise getRawBody()
  qui extrait le body de rawContent.
  Même en rawMode, on sauvegarde
  du body seul → plus jamais de
  double frontmatter.
end note

EffCoord --> RawContent : rawMode ?\nserializeFm(fm) + body → rawContent
EffCoord --> Tiptap : !rawMode ?\nsetContent(body)

legend top
  ✅ Le fix : getContent retourne
  TOUJOURS du body seul, quel que
  soit le mode. tab.content = body.
  Plus de double frontmatter.
  L'invariant est garanti à la source.
endlegend

@enduml
```

---

## Fix appliqué

**Approche choisie** : Nettoyer la sortie du getter à la source.

Dans `Editor.svelte`, le getter de contenu utilise désormais `getRawBody()`
pour extraire le body seul, même en rawMode :

```ts
// Editor.svelte, ligne 241
getContent?.(() => rawMode ? getRawBody(rawContent) : getMarkdown());
```

**Pourquoi cette approche** :

1. **Invariant respecté** : `tab.content` ne contient **jamais** de frontmatter,
   quel que soit le mode de l'éditeur
2. **Aucun changement dans switchToTab** : pas besoin d'exposer `rawMode` au store,
   pas de logique de split côté store
3. **Aucun régression** : `handleSave` ne passe pas par `_editorGetContent` — il
   utilise `rawContent` directement via `onSave` et `doRawAutoSave`
4. **Une seule source de vérité** : `getRawBody()` est déjà utilisé ailleurs
   (dans le flux normal de toggle), la fonction est rodée

**Risque écarté** : on pourrait craindre que d'autres appelants de `getContent`
dépendent de la présence du frontmatter. La vérification du code montre que
les seuls appelants sont `switchToTab` et `handleSave` — ce dernier ne passe
pas par `getContent`. Zéro impact.

---

## Invariants (vérifiés et respectés ✅)

1. **`tab.content` ne contient que le body**, jamais le frontmatter.
   - Vérifié au chargement depuis l'API (`data.body`)
   - Vérifié au reload depuis disque (`data.body`)
   - ✅ Vérifié au save depuis l'éditeur (getRawBody extrait le body, même en rawMode)

2. **Le frontmatter est toujours dans `tab.frontmatter`**, jamais dans `tab.content`.

3. **`rawContent` (état local de Editor.svelte) = frontmatter + body** —
   c'est le seul endroit où la fusion existe. Plus jamais propagé dans le store.

4. **`getMarkdown()` retourne toujours le body sans frontmatter** —
   `tiptap-markdown` ne connaît pas le frontmatter.

5. **L'invariant est garanti à la source** — le getter (`getContent`) retourne
   du body seul quel que soit le mode. Aucun appelant ne peut recevoir de
   frontmatter dans `tab.content`.

---

## Fichiers

| Fichier | Lignes clés | Rôle |
|---------|-------------|------|
| `src/lib/components/Editor.svelte` | 33, 241, 257-285, 330 | rawMode local, getter avec `getRawBody()`, coordination `$effect`, toggle button |
| `src/lib/stores/editor.svelte.ts` | 123-148 | `switchToTab` : save + load tab.content |
| `src/routes/+page.svelte` | 560-588 | Passage de `rawMode={$settings.defaultRawMode}` |


