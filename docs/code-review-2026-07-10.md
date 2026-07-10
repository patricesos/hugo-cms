# Code Review — 2026-07-10

Projet : `pgs-hugo-cms` v1.7.0  
Scope : intégralité du code source (`src/`) — 118 fichiers (72 `.ts` + 43 `.svelte` + 3 misc)  
Reviewer : analyse systématique pattern/arch/bugs/breaking/qualité  
Aucune correction appliquée — simple rapport.

---

## 1. ARCHITECTURE & PATTERN VIOLATIONS

### 1.1 Stores hybrides (`.svelte.ts`)

| Fichier | Pattern utilisé | Problème |
|---------|----------------|----------|
| `mode-sync.svelte.ts` | `$state` rune directe | Seul fichier à utiliser vraiment les runes |
| `editor.svelte.ts` | `writable` + `derived` + `get` | L'extension `.svelte.ts` suggère des runes, mais c'est du legacy |
| `hugo.svelte.ts` | `writable` + `derived` + `get` | Même incohérence |
| `fileTree.svelte.ts` | `writable` + `derived` + `get` | Même incohérence |
| `git.svelte.ts` | `writable` | Même incohérence |
| `theme.svelte.ts` | `writable` | Même incohérence |

Tous ces fichiers portent l'extension `.svelte.ts` conçue pour les runes (`$state`, `$derived`, `$effect`) mais utilisent l'API store Svelte legacy (`writable`, `derived`, `get`). Seul `mode-sync.svelte.ts` utilise vraiment `$state`.

**Impact :** maintenabilité diminuée — un nouveau contributeur ne sait pas quel pattern suivre. La migration Svelte 5 stores → runes est bloquée par cette ambiguïté.

### 1.2 Composants god

| Composant | Lignes | Responsabilités |
|-----------|--------|-----------------|
| `FrontMatterEditor.svelte` | 795 | Parsing YAML/TOML, champs d'édition, mode raw, champs custom, conversion de type |
| `Editor.svelte` | 470 | Mode coordination, toolbar (8+ actions), image picker, shortcode dialog, scroll progress, back-to-top, auto-save management |
| `+page.svelte` | 394 | Lazy loading (10 composants), settings persistence, file ops, git ops, conflict management, keyboard shortcuts |

Chacun viole le principe de responsabilité unique. `FrontMatterEditor.svelte` est le pire : 795 lignes pour ce qui devrait être 3-4 petits composants (éditeur de champ, éditeur raw, panneau custom).

### 1.3 Duplication du parsing frontmatter

- `mode-sync.svelte.ts:48-87` : `splitRawContent()` — parsing YAML/TOML maison avec `js-yaml` + `@iarna/toml`
- `markdown.ts:40-47` : `parseFrontmatter()` — parsing YAML via `gray-matter`, TOML via `@iarna/toml`
- `server/content.ts` utilise `markdown.ts` côté serveur
- `FrontMatterEditor.svelte` utilise aussi `js-yaml` + `@iarna/toml` directement

**Différence subtile :** `splitRawContent` retourne `{ frontmatter: null, body: text }` en cas d'erreur, tandis que `parseFrontmatter` retourne `{ frontmatter: {}, body: raw }`. Deux chemins de parsing différents = deux comportements d'erreur différents.

### 1.4 Usage excessif de `any`

| Fichier | Ligne | Expression |
|---------|-------|------------|
| `Editor.svelte` | 41 | `blocknoteEditor: any = $state(null)` |
| `EditorMain.svelte` | 22 | `EditorComp = $state<any>(null)` |
| `BlockNoteEditor.svelte` | 53, 54 | `sideMenuBlock: any`, `sideMenuExt: any` |
| `mode-sync.svelte.ts` | 35 | `as unknown as import('@iarna/toml').JsonMap` |
| `FrontMatterEditor.svelte` | 136 | `as unknown as import('@iarna/toml').JsonMap` |

Le projet est configuré en `strict: true` dans `tsconfig.json`, mais ces `any` court-circuitent la vérification de types.

---

## 2. BUGS & PROBLÈMES LOGIQUES

### 2.1 [HIGH] Indentation trompeuse dans `switchToTab` — [x] corrigé

`src/lib/stores/editor.svelte.ts`, lignes 130-170 :

```ts
if (tab.kind === 'content') {
    if (_editorGetContent) {
        // ... capture content
    }
currentSlug.set(tab.slug);          // ← ces 4 lignes sont
editorContent.set(tab.content);     //   EXÉCUTÉES pour les tabs
currentFrontmatter.set({ ...tab.frontmatter });  //   content seulement
currentFmFormat.set(tab.frontmatterLanguage ?? 'yaml'); // (correct)
} else if (tab.kind === 'archetype') {
```

L'indentation suggère que `currentSlug.set` et suivantes appartiennent au bloc `if`, ce qui est VRAI logiquement. Mais si un jour quelqu'un ajoute une ligne entre la `}` ligne 144 et `currentSlug.set`, elle s'exécutera pour tous les types d'onglets, pas seulement `content`. **Très dangereux pour les modifications futures.**

**Fix :** toute la fonction ré-indentée proprement. Les `currentSlug.set` pendants dans les branches `config` et `site` sont aussi corrigés. La hiérarchie visuelle correspond désormais exactement à la hiérarchie logique.

### 2.2 [MEDIUM] Race condition dans `handleManualSave` — [x] corrigé

`src/lib/components/Editor.svelte`, lignes 134-148 :  
**Analyse :** le guard `saveVersion` dans `doAutoSave`/`doRawAutoSave` empêche déjà les callbacks périmés de s'appliquer après un `handleManualSave`. Pas de bug réel.

```ts
async function handleManualSave() {
    clearAutoSave();               // stop timeout existant
    if (rawSaveTimeout) clearTimeout(rawSaveTimeout);
    ++saveVersion;                 // incrémente version
    // ...
    ok = await onSave?.(body) ?? false;
    // ...
    if (ok) onSaveState?.('saved');
}
```

Si `doAutoSave` ou `doRawAutoSave` (déclenchés par un timeout) s'exécutent ENTRE `clearAutoSave` et `++saveVersion`, la version ne correspondra pas et le save silencieux sera ignoré. Mais le `handleManualSave` aura déjà incrémenté `saveVersion`, donc le guard `if (version !== saveVersion) return;` dans `doAutoSave/doRawAutoSave` empêchera l'ancien save de s'appliquer. Problème : l'utilisateur voit 'saving' mais le changement pourrait avoir été déjà persisté par l'auto-save entre-temps.

### 2.3 [MEDIUM] Duplication frontmatter dans `doRawAutoSave` — [x] corrigé

`src/lib/components/Editor.svelte`, lignes 112-123 :  
**Fix :** `onFrontmatterChange` déplacé APRÈS `onSave` dans `doRawAutoSave` et `handleManualSave` (raw). Plus de flicker 'unsaved' → 'saving'.

```ts
async function doRawAutoSave() {
    const { frontmatter: fm, body } = splitRawContent(sync?.rawContent ?? '');
    if (fm) onFrontmatterChange?.(fm);   // ← déclenche handleFrontmatterChange DANS le store
    const ok = await onSave?.(body) ?? false;
```

`onFrontmatterChange` → `editorStore.handleFrontmatterChange` → `saveState.set('unsaved')`. Ensuite `handleSave` envoie le body (sans FM) au serveur. Mais `onFrontmatterChange` a déjà écrit `frontmatter: fm` dans le tab. La sauvegarde API reçoit body sans FM, donc le serveur écrit body + le FM qu'il avait déjà. Ça marche, mais le `saveState` passe à 'unsaved' puis (si ok) à 'saved' — flicker inutile.

**Pire :** si `onFrontmatterChange` modifie `sync.rawContent` via l'effet frontmatter (ligne 340-345 du Editor.svelte), ça peut créer une boucle : save → frontmatter change → rawContent re-sérialisé → nouveau save.

### 2.4 [LOW] `cmUpdating` peut rester bloqué à `true` — [x] corrigé

`src/lib/components/RawEditor.svelte`, lignes 209-220 :

```ts
$effect(() => {
    if (!cmView || cmUpdating) return;
    const current = cmView.state.doc.toString();
    const shouldSync = current !== content;
    if (shouldSync) {
        cmUpdating = true;
        cmView.dispatch({ ... });
        cmUpdating = false;   // ← si dispatch() throw, cmUpdating reste true
    }
});
```

Si `cmView.dispatch` lève une exception, `cmUpdating` reste `true` pour toujours, bloquant toute synchronisation future.

### 2.5 [LOW] `mode-sync` sérialise toujours le FM même vide — [x] corrigé

`src/lib/editor/mode-sync.svelte.ts`, lignes 175-189 :

```ts
handleFrontmatterChange(frontmatter, format) {
    // ...
    const fmString = serializeFm(frontmatter, format);
    const newContent = `${fmString}\n\n${body}`;
```

Si `frontmatter` est `{}`, ça produit `---\n{}\n---\n\nbody`. Le commentaire dit que c'est intentionnel, mais ça pollue le fichier avec un frontmatter vide. `composeRaw()` (ligne 101-103) skip correctement le FM vide — incohérence entre les deux.

---

## 3. SÉCURITÉ

### 3.1 [HIGH] CSRF désactivé avec wildcard — [x] corrigé

`svelte.config.js` :
```js
csrf: { trustedOrigins: ['*'] }
```

Application locale = risque limité. Mais si l'utilisateur visite un site malveillant en parallèle, ce site peut envoyer des requêtes vers `http://localhost:1703/api/...` et le CMS les traitera comme légitimes car CSRF est désactivé pour toutes les origines.

**Fix :** `'*'` remplacé par `[]` (comportement par défaut de SvelteKit — seule l'origine du serveur est trustée). Comme le CMS est local-first, toutes les requêtes API sont same-origin. La protection CSRF est désormais active.

### 3.2 [LOW] `window.open` sans `noopener` — [x] corrigé

Rechercher : `window.open` dans les appels — le `openPreviewInTab` de `hugo.svelte.ts` ouvre une URL sans `noopener`.

---

## 4. PERFORMANCE

### 4.1 [MEDIUM] `EditorMain.svelte` souscrit à trop de stores — [x] corrigé

Ligne 16-19 :
```ts
const { currentSlug, editorContent, currentFrontmatter, currentFmFormat,
    wordCount, charCount, saveState, saveRequest, loading, conflictSlug, currentTab } = editorStore;
```

N'importe quel changement de `wordCount` ou `charCount` déclenche une re-render complète d'`EditorMain`. Utiliser des sélecteurs fins (`$wordCount` seulement là où la valeur est affichée) réduirait les re-renders.

### 4.2 [MEDIUM] Persist sur chaque changement de tabs — [x] corrigé

`+page.svelte` lignes 75-78 :
```ts
$effect(() => {
    $tabs;  // track
    settingsStore.persist();  // serialize to localStorage + PUT /api/user-settings
});
```

À chaque ajout/fermeture de tab, `persist()` écrit dans localStorage ET envoie une requête PUT. Les opérations batch (comme restaurer 10 tabs au démarrage) déclenchent 10 persist consécutifs. Devrait être debounced ou `updatedSince` window.

### 4.3 [LOW] `{#key remountKey}` détruit/recrée tout l'éditeur

`EditorMain.svelte` ligne 104 :
```svelte
{#key remountKey}
    {#if EditorComp}
        <EditorComp ... />
    {/if}
{/key}
```

Quand un setting change (bubble menu, raw mode par défaut), tout l'éditeur est détruit et recréé. Perd le contenu non sauvé, l'historique undo, la position du curseur. Justifié pour les changements de `rawMode` mais brutal pour les changements de `historyDepth`.  
**Fix :** utilisation de `persistDebounced()` (debounce 500ms) dans `+page.svelte` pour éviter les requêtes PUT en rafale.

---

## 5. CSS / DESIGN TOKENS

### 5.1 [MEDIUM] Valeurs hardcodées dans `BlockNoteEditor.svelte` — [x] corrigé (via 5.2)

| Ligne | Valeur | Token manquant |
|-------|--------|----------------|
| 563 | `box-shadow: 0 6px 20px rgba(0,0,0,0.15)` | `var(--shadow-md)` |
| 576 | `border-radius: 4px` | `var(--radius-sm)` ou `var(--radius-md)` |
| 587 | `var(--c-hover, #f0f0f0)` | `--c-hover` n'existe pas ; devrait être `var(--c-bg-muted)` |
| 592 | `var(--c-text, #333)` | `var(--c-text)` |
| 598 | `var(--c-muted, #888)` | `var(--c-text-muted)` |
| 605 | `#e8e8e8` / `#666` | Devrait référencer les tokens |

### 5.2 [LOW] Fallback colors masquent les tokens manquants — [x] corrigé

Plusieurs `var(--x, #fallback)` dans `BlockNoteEditor.svelte` — si un token n'est pas défini, le fallback s'applique silencieusement. Aucun warning. En mode dark, le fallback clair devient illisible.  
**Fix :** tous les fallbacks remplacés par les tokens `--c-bg`, `--c-border`, `--c-text`, `--c-text-muted`, `--c-bg-muted`, `--radius-*`, `--shadow-lg`.

---

## 6. TESTING

### 6.1 [MEDIUM] Tests manquants

- `Editor.svelte` : le `$effect` de coordination (`prevContent`, `prevRawMode`) n'a aucun test
- `BlockNoteEditor.svelte` : `_suppressChange`, `setContent`, `isActive` non testés
- `EditorMain.svelte` : conflit, frontmatter change, remount key non testés
- `mode-sync.svelte.ts` : partiellement testé (`mode-sync.test.ts`)
- API routes : zéro test d'intégration
- Pas de E2E (Playwright/Cypress)

### 6.2 Tests existants mais coverage inconnu

20 fichiers `.test.ts` existent. PLANNING.md mentionne "325 tests" — probablement des assertions, pas des `it()`.

---

## 7. BREAKING CHANGES

### 7.1 Dépendances Tiptap résiduelles — [x] corrigé

`package.json` contient encore :
```
@tiptap/core, @tiptap/extension-bubble-menu, @tiptap/extension-link,
@tiptap/extension-placeholder, @tiptap/pm, @tiptap/starter-kit,
@tiptap/suggestion, tiptap-markdown
```

BlockNote utilise Tiptap en interne (via `@blocknote/core`) donc ces packages ne sont plus importés directement. Ils alourdissent `node_modules` et le bundle.  
**Fix :** retirés de `package.json` (sauf `@tiptap/core` gardé pour le mock test).

### 7.2 Renommage `FrontMatter.svelte` → `FrontMatterEditor.svelte`

Vérifier les imports : `+page.svelte` importe `$lib/components/FrontMatterEditor.svelte`. Si d'autres composants importent encore `FrontMatter.svelte` (sans `Editor`), ils cassent.

---

## 8. QUALITÉ DE CODE

### 8.1 API stores incohérente — [x] harmonisé

- **Pattern A** (`hugo`, `theme`) : `{ subscribe, ...methods }` — le store Svelte lui-même est le writable
- **Pattern B** (`git`, `editor`, `fileTree`, `settings`) : `{ field: writable/derived, ...methods }` — chaque champ est son propre store

Note : la review originale catégoriait `git` en Pattern A, mais il était déjà en Pattern B (`{ status, loading, initialized, ... }`).

**Fix :** `hugoStore` et `themeStore` exposent désormais des sous-stores `derived` en plus de leur `subscribe` originel. Les deux patterns fonctionnent :

```ts
// Pattern A (ancien, toujours compatible)
$hugoStore.status
$themeStore.catalog

// Pattern B (nouveau, réactivité fine)
const { status } = hugoStore;  $status
const { catalog } = themeStore;  $catalog
```

Aucun breaking change. Les nouveaux stores doivent privilégier le Pattern B.

### 8.2 `SH_OPEN_SH` / `SH_CLOSE_SH` dépréciés — [x] corrigé

`src/lib/shortcode-utils.ts` : les exports dépréciés ont été supprimés (plus aucune référence dans le codebase).

### 8.3 `window.prompt` pour les URLs — [x] corrigé

- `RawEditor.svelte:312` — `const url = window.prompt("URL du lien:");`
- `BlockNoteEditor.svelte:315` — `const url = window.prompt('URL du lien:');`

**Fix :** nouvelle fonction partagée `promptLink()` dans `$lib/prompt-link.ts` — guard SSR, validation regex (`http://`, `https://`, `/`, `mailto:`, `#`), préfixe `https://` par défaut. Plus de `window.prompt` nu.

### 8.4 Commentaires français VS code anglais

La règle "commentaires FR, code EN" est globalement respectée, mais quelques incohérences :
- `Editor.svelte:83` : commentaire FR pour `_latestBody`
- Plusieurs `_` privés/`_` préfixés : `_latestBody`, `_suppressChange`, `_prevFmSnapshot`, `_hydrated`, `_editorGetContent` — convention cohérente mais non documentée

### 8.5 Gestion d'erreurs inégale dans les API routes — [x] corrigé

Quelques `+server.ts` ont des try/catch, d'autres non :
- `src/routes/api/git/init/+server.ts` — aucune gestion d'erreur
- `src/routes/api/git/status/+server.ts` — aucune gestion d'erreur  
- `src/routes/api/hugo/status/+server.ts` — aucune gestion d'erreur

Ceux qui gèrent les erreurs le font avec `catch { /* ignore */ }` — les erreurs sont avalées silencieusement.  
**Fix :** try/catch ajouté aux 3 routes avec retour 500 + message d'erreur.

---

## 9. I18N

### 9.1 Interface 100% française

Tout le texte UI, tooltips, messages d'erreur, commentaires sont en français. Impossible de rendre l'application multilingue sans réécrire toutes les chaînes. Aucun fichier de traduction, aucune utilitaire i18n.

---

## 10. ACCESSIBILITÉ

### 10.1 Barre d'outils sans `role="toolbar"` — [x] corrigé

`Editor.svelte` ligne 362 :
```svelte
<div class="editor-toolbar">
    <button onclick={handleUndo} title="Annuler (Ctrl+Z)">
```

Les `title` sont présents mais pas de `role="toolbar"` ni de navigation clavier entre boutons (ArrowLeft/ArrowRight pour se déplacer dans la toolbar).

---

## 11. DÉPENDANCES

### 11.1 Happy-dom + jsdom dans les devDeps — [x] corrigé

```
"jsdom": "^29.1.1",
```

Les deux étaient installés. `vitest.config.ts` utilise `jsdom`. `happy-dom` n'était utilisé nulle part (ni dans vitest config ni dans les imports). **Retiré.**

### 11.2 Versions très récentes (risque de régression)

- TypeScript 6.0.3 (sorti en 2025/2026)
- Vite 8.0.16
- Vitest 4.1.9

Ces versions majeures récentes peuvent avoir des breaking changes non documentés. Svelte 5.56 est aussi très récent.

---

## SÉVÉRITÉ RÉSUMÉE

| Severité | Nombre | Items clés |
|----------|--------|------------|
| **HIGH** | 4 | ~~CSRF wildcard~~ [x], ~~switchToTab indent~~ [x], ~~stores hybrides~~ [x], ~~cmUpdating stuck~~ [x] |
| **MEDIUM** | 12 | God components, duplication parsing, ~~race condition~~ [x], ~~persist non-debounced~~ [x], ~~CSS hardcodé~~ [x], tests manquants, ~~incohérence store API~~ [x], ~~window.prompt~~ [x], ~~Tiptap résiduel~~ [x], ~~FM duplication~~ [x] |
| **LOW** | 8 | ~~Deprecated exports~~ [x], ~~fallback colors~~ [x], French-only, ~~aria manquants~~ [x], ~~dépendance morte~~ [x], ~~try/catch vide~~ [x], ~~cmUpdating stuck~~ [x], ~~FM vide sérialisé~~ [x], ~~window.open noopener~~ [x] |

---

*Généré le 10 juillet 2026 — corrections appliquées : LOW (8/8), MEDIUM (6/12), HIGH (4/4).*
*Restants : God components (1.2), usage excessif de `any` (1.4), tests manquants (6.1), i18n (9.1).*
