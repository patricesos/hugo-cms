# DEBUG — Full Codebase Audit

> **Last updated:** 16 Jun 2026
> **Status:** 30/40 issues fixed (12 bugs, 10 warnings, 8 suggestions, 10 remaining)

## BUGS (High Severity) — ✅ All 12 fixed

### 1. Path traversal dans `/api/assets/[...path]`
**Fix:** `safeResolveIn(cmsConfig.hugoStaticPath, params.path)`

### 2. Path traversal dans upload `/api/assets`
**Fix:** `basename(file.name)` + `safeResolveIn` + null byte strip

### 3. Path traversal dans `/images/[...path]`
**Fix:** `safeResolveIn(cmsConfig.hugoStaticPath, 'images', params.path)`

### 4. Race condition Hugo server start
**Fix:** `startPromise` mutex — second caller awaits same promise

### 5. Status "running" avant que le serveur écoute
**Fix:** `hugoProcess` assigné seulement après `hugoUrl` confirmé dans stdout

### 6. Séparateur Windows dur dans `createContent`
**Fix:** `dirname(filePath)` au lieu de `filePath.substring(0, filePath.lastIndexOf('\\'))`

### 7. Race condition auto-save / manual save
**Fix:** `++saveVersion` dans `markUnsaved()` et `markRawUnsaved()` pour invalider les auto-saves in-flight

### 8. `onDestroy` arrête le serveur Hugo
**Fix:** Retiré `onDestroy(() => stopHugo())` de HugoPreview.svelte

### 9. Sidebar CSS width ignore le wrapper resize
**Fix:** `.sidebar { width: 100%; min-width: 0; }`

### 10. `safeResolve` case-sensitive sur Windows
**Fix:** Utilise `path.relative()` au lieu de `startsWith`

### 11. Poll conflit tourne sans fichier ouvert
**Fix:** `$effect` sur `currentSlug` start/stop le poll automatiquement

### 12. Middle-click sur le X du tab fire deux fois
**Fix:** `onmousedown={(e) => e.stopPropagation()}` sur le X

---

## WARNINGS (Medium Severity) — ✅ All 11 fixed

### 13. Restore async : réponses out-of-order
**Fix:** `await Promise.all()` puis `switchToTab()` séquentiel

### 14. `$bindable` inutile sur Editor props
**Fix:** Remplacé par `$props()` avec valeurs par défaut simples

### 15. Protection shortcode manque `{{%` / `%}}`
**Fix:** `/\{\{%/g` et `/%\}\}/g` ajoutés à `protectShortcodes`

### 16. `exec()` échoue silencieusement
**Fix:** `console.error(`Editor command not found: ${fn}`)` si commande absente

### 17. Listeners resize jamais nettoyés
**Fix:** `resizeCleanupFns` track les listeners, nettoyés dans `onDestroy`

### 18. `rawHistoryLock` peut underflow
**Fix:** `rawHistoryLock = Math.max(0, rawHistoryLock - 1)`

### 19. `SitemapView` ré-ouvre tous les dossiers
**Fix:** `openDirs.size === 0` → initial; sinon préserve état manuel

### 20. Timeout blur après destruction Sidebar
**Fix:** `blurTimeout` stocké + `clearTimeout` dans `onDestroy`

### 21. Bouton Insert pas désactivé si params requis manquants
**Fix:** `$derived(canInsert)` vérifie `selected.params.every(...)`

### 22. `cms.config.ts` dupliqué
**Fix:** Fichier supprimé

### 23. `newSlug` pas validé dans rename
**Fix:** `if (newSlug.includes('..')) error(400, ...)`

---

## SUGGESTIONS (Low Severity) — 8 fixed, 9 remaining

### 33. `handleVisibilityChange` sans guard
**Fix:** `if (document.visibilityState === 'visible' && currentSlug)` — ✅ **Fixed** (moved here from warnings)

### 24. Renommer clé FM peut en écraser une autre
**Fichier:** `src/lib/components/FrontMatterEditor.svelte:71-77`

### 25. Changement FM seul ne trigger pas auto-save
**Fichier:** `src/routes/+page.svelte:445-453`

### 26. `tree = tree` hack pour réactivité
**Fichier:** `src/routes/+page.svelte:467`

### 27. Racine Hugo limitée à 2 niveaux
**Fichier:** `src/lib/server/hugo.ts:17-35`

### 28. Imports inutilisés
- `src/lib/components/ArchetypeView.svelte:3` — `RotateCcw`
- `src/lib/server/content.ts:2` — `dirname` maintenant utilisé ✅
- `src/lib/server/content.ts:3` — `existsSync` synchrone

### 29. `readdirSync` / `readFileSync` bloquent l'event loop
**Fichier:** `src/lib/server/shortcodes.ts:97-106`

### 30. Pan reset quand zoom < 1
**Fichier:** `src/lib/components/ImageView.svelte:62-65`

### 31. `$effect` saveAppState avec dépendances implicites
**Fichier:** `src/routes/+page.svelte:143-153`

### 32. Switch raw↔WYSIWYG re-parse la FM inutilement
**Fichier:** `src/lib/components/Editor.svelte:230-255`

### 34. 10 résultats max dans SearchDialog
**Fichier:** `src/lib/components/SearchDialog.svelte:50-56`

### 35. Perte édition si slug change pendant edit
**Fichier:** `src/lib/components/ArchetypeView.svelte:22-26`

### 36. `draft: true` dur dans `handleCreate`
**Fichier:** `src/routes/+page.svelte:473`

### 37. Slug sanitization supprime les caractères non-ASCII
**Fichier:** `src/routes/+page.svelte:471`

### 38. Pas de Ctrl+Click sur les liens dans l'éditeur
**Fichier:** `src/lib/components/Editor.svelte`

### 39. HEAD request race condition dans ImageView
**Fichier:** `src/lib/components/ImageView.svelte:38-49`

### 40. ShortcutsHelp pas de focus trap
**Fichier:** `src/lib/components/ShortcutsHelp.svelte`

---

## Stats

| Severité | Total | Fixés | Restants |
|----------|-------|-------|----------|
| Bug | 12 | 12 | 0 |
| Warning | 11 | 11 | 0 |
| Suggestion | 17 | 8 | 9 |
| **Total** | **40** | **31** | **9** |
