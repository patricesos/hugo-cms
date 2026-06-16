# DEBUG — Full Codebase Audit

## BUGS (High Severity)

### 1. Path traversal dans `/api/assets/[...path]`
**Fichier:** `src/routes/api/assets/[...path]/+server.ts:17`
**Problème:** `join(cmsConfig.hugoStaticPath, params.path)` sans `safeResolve`.
Une requête `/api/assets/../../../etc/passwd` lit des fichiers arbitraires.
**Fix:** Ajouter `safeResolve` comme dans `content.ts`.

### 2. Path traversal dans upload `/api/assets`
**Fichier:** `src/routes/api/assets/+server.ts:27,38`
**Problème:** `file.name` non sanitizé dans `join(...)`. Un nom comme `../../evil.exe` résout hors du dossier static.
**Fix:** Stripper `..`, `/`, `\`, null bytes du filename.

### 3. Path traversal dans `/images/[...path]`
**Fichier:** `src/routes/images/[...path]/+server.ts:16`
**Problème:** Même vulnérabilité que #1.
**Fix:** Ajouter `safeResolve`.

### 4. Race condition Hugo server start
**Fichier:** `src/lib/server/hugo.ts:46-48`
**Problème:** Deux appels simultanés à `startHugoServer()` peuvent passer le guard `if (hugoProcess && hugoProcess.exitCode === null)` avant le premier `spawn`, spawnant deux processus.
**Fix:** Mutex / état atomique.

### 5. Status "running" avant que le serveur écoute
**Fichier:** `src/lib/server/hugo.ts:56-67`
**Problème:** `hugoProcess = spawn(...)` assigné synchrone, mais le processus peut échouer (binaire introuvable, port pris). `getHugoStatus()` retourne `running=true` avant que le serveur soit prêt.
**Fix:** Ne setter `hugoProcess` qu'après confirmation startup.

### 6. Séparateur Windows dur dans `createContent`
**Fichier:** `src/lib/server/content.ts:70`
**Problème:** `filePath.lastIndexOf('\\')` plante sur POSIX.
`dirname` importé mais pas utilisé.
**Fix:** Remplacer par `dirname(filePath)`.

### 7. Race condition auto-save / manual save
**Fichier:** `src/lib/components/Editor.svelte:101-120`
**Problème:** `doAutoSave()` incrémente `saveVersion` avant `await onSave`. Une sauvegarde manuelle (qui incrémente aussi `saveVersion`) peut faire échouer le check de version de l'auto-save, laissant `saveState` bloqué à `'saving'`.
**Fix:** Debounce trailing edge.

### 8. `onDestroy` arrête le serveur Hugo
**Fichier:** `src/lib/components/HugoPreview.svelte:21-23`
**Problème:** `onDestroy` appelle `stopHugo()` qui tue le serveur quand on ferme le panneau. L'utilisateur perd le serveur même s'il veut juste cacher le panneau.
**Fix:** Retirer `onDestroy` stop.

### 9. Sidebar CSS width ignore le wrapper resize
**Fichier:** `src/lib/components/Sidebar.svelte:117-118`
**Problème:** `.sidebar` a `width: 280px; min-width: 280px` en dur, mais le parent `.sidebar-wrap` a `style="width: {sidebarWidth}px"` dynamique. Le contenu est cropé si `sidebarWidth < 280`.
**Fix:** Utiliser `width: 100%` sur `.sidebar`.

### 10. `safeResolve` case-sensitive sur Windows
**Fichier:** `src/lib/server/content.ts:12-18`
**Problème:** `resolved.startsWith(resolve(BASE))` compare la casse. Sur Windows, `BASE="C:\content"` mais `resolved="c:\Content\file.md"` lève une fausse erreur.
**Fix:** Normaliser la casse ou utiliser `path.relative()`.

### 11. Poll conflit tourne sans fichier ouvert
**Fichier:** `src/routes/+page.svelte:159-169`
**Problème:** `startConflictPoll()` appelé une fois au mount, `stopConflictPoll()` seulement au cleanup. Le callback fetch `/api/content/undefined` toutes les 5s.
**Fix:** Stoppper le poll quand `!currentSlug`.

### 12. Middle-click sur le X du tab fire deux fois
**Fichier:** `src/lib/components/TabBar.svelte:30,47-48`
**Problème:** `mousedown` (bouton 1) sur le tab + `click` sur le X → `onClose` appelé deux fois.
**Fix:** Ajouter `e.stopPropagation()` sur le X `onmousedown`.

---

## WARNINGS (Medium Severity)

### 13. Restore async : réponses out-of-order
**Fichier:** `src/routes/+page.svelte:119-136`
**Problème:** Les fetch concurrents (boucle for) peuvent répondre dans le désordre. La réponse d'un tab inactif peut écraser l'état éditeur du tab actif. `switchToTab` s'exécute avant le chargement des contenus.
**Fix:** `await Promise.all(fetches)` puis `switchToTab`.

### 14. `$bindable` inutile sur Editor props
**Fichier:** `src/lib/components/Editor.svelte:29`
**Problème:** `frontmatter` et `frontmatterFormat` en `$bindable()` mais le parent passe en props simples, pas en bind.
**Fix:** Remplacer par `$props()`.

### 15. Protection shortcode manque `{{%` / `%}}`
**Fichier:** `src/lib/components/Editor.svelte:54-59`
**Problème:** Hugo a `{{< shortcode >}}` ET `{{% shortcode %}}`. Seul `{{<`/`>}}` est protégé.
**Fix:** Ajouter `{{%`/`%}}`.

### 16. `exec()` échoue silencieusement
**Fichier:** `src/lib/components/Editor.svelte:330-337`
**Problème:** `exec` cast `as any` et appelle `chain?.[fn]`. Si `fn` n'existe pas, échec silencieux.
**Fix:** Valider la méthode ou logger l'erreur.

### 17. Listeners resize jamais nettoyés
**Fichier:** `src/routes/+page.svelte:219-278`
**Problème:** `startResize`, `startFmResize`, `startPreviewResize` ajoutent des `document` listeners qui fuient si le composant unmount pendant un drag.
**Fix:** Nettoyer dans `onDestroy`.

### 18. `rawHistoryLock` peut underflow
**Fichier:** `src/lib/components/Editor.svelte:500-507`
**Problème:** `pushRawHistory` décrémente `rawHistoryLock` si > 0. Si `markRawUnsaved()` fire plus de fois que undo/redo n'ont locké, le counter devient négatif et ne se récupère jamais.
**Fix:** `rawHistoryLock = Math.max(0, rawHistoryLock - 1)`.

### 19. `SitemapView` ré-ouvre tous les dossiers
**Fichier:** `src/lib/components/SitemapView.svelte:28-38`
**Problème:** `$effect` recrée `openDirs = slugs` à chaque changement d'arbre, perdant les collapses manuels.
**Fix:** Ne pas refermer les dossiers déjà ouverts.

### 20. Timeout blur après destruction Sidebar
**Fichier:** `src/lib/components/Sidebar.svelte:76`
**Problème:** `setTimeout(() => dropdownOpen = false, 150)` peut fire après unmount.
**Fix:** Stocker le timeout et le cleaner dans `onDestroy`.

### 21. Bouton Insert pas désactivé si params requis manquants
**Fichier:** `src/lib/components/ShortcodeDialog.svelte:262`
**Problème:** `disabled={!selected}` laisse cliquer même si des params requis sont vides. `buildShortcode()` retourne `''`.
**Fix:** Vérifier les params requis aussi.

### 22. `cms.config.ts` dupliqué
**Fichier:** `cms.config.ts` (root)
**Problème:** Duplicata de `src/lib/server/config.ts`. Jamais importé nulle part.
**Fix:** Supprimer le fichier root.

### 23. `newSlug` pas validé dans rename
**Fichier:** `src/routes/api/content/[...slug]/+server.ts:93-104`
**Problème:** `newSlug` de l'utilisateur passe à `renameContent` sans validation explicite → 409 au lieu de 400 pour path traversal.
**Fix:** Valider `newSlug` et retourner 400.

---

## SUGGESTIONS (Low Severity)

### 24. Renommer clé FM peut en écraser une autre
**Fichier:** `src/lib/components/FrontMatterEditor.svelte:71-77`
**Problème:** `updateCustomKey` remplace sans warning si `newKey` existe déjà.
**Fix:** Vérifier + avertir.

### 25. Changement FM seul ne trigger pas auto-save
**Fichier:** `src/routes/+page.svelte:445-453`
**Problème:** `handleFrontmatterChange` set `saveState='unsaved'` mais ne déclenche pas l'auto-save de l'éditeur.
**Fix:** Déclencher un debounced save.

### 26. `tree = tree` hack pour réactivité
**Fichier:** `src/routes/+page.svelte:467`
**Problème:** `walk(tree)` mute in-place. `tree = tree` force la réactivité Svelte. Fragile.
**Fix:** Retourner un nouveau tableau.

### 27. Racine Hugo limitée à 2 niveaux
**Fichier:** `src/lib/server/hugo.ts:17-35`
**Problème:** `findHugoRoot()` ne checke que `../` et `../../`. Si `HUGO_CONTENT_PATH` est 3+ niveaux deep, racine non trouvée. Manque `config.yaml`, `config.json`.
**Fix:** Walk up récursif.

### 28. Imports inutilisés
- `src/lib/components/ArchetypeView.svelte:3` — `RotateCcw` jamais utilisé
- `src/lib/server/content.ts:2` — `dirname` importé mais pas utilisé
- `src/lib/server/content.ts:3` — `existsSync` utilisé synchrone

### 29. `readdirSync` / `readFileSync` bloquent l'event loop
**Fichier:** `src/lib/server/shortcodes.ts:97-106`
**Problème:** Opérations synchrones bloquantes pour le scan des shortcodes.
**Fix:** Utiliser les versions async (`fs/promises`).

### 30. Pan reset quand zoom < 1
**Fichier:** `src/lib/components/ImageView.svelte:62-65`
**Problème:** `setScale` reset `panX`/`panY` à 0 quand target < 1. Désorientant au scroll molette.
**Fix:** Ne reset que sur fit-to-screen explicite.

### 31. `$effect` saveAppState avec dépendances implicites
**Fichier:** `src/routes/+page.svelte:143-153`
**Problème:** Les dépendances listées sont trompeuses — `showPreview` et `previewWidth` sont lues dans `saveAppState()` mais pas listées.
**Fix:** Ajouter commentaire ou restructurer.

### 32. Switch raw↔WYSIWYG re-parse la FM inutilement
**Fichier:** `src/lib/components/Editor.svelte:230-255`
**Problème:** La FM est sérialisée puis re-parsée même sans changement, perdant commentaires/ordre YAML.
**Fix:** Ne round-tripper que si contenu modifié.

### 33. `handleVisibilityChange` sans guard
**Fichier:** `src/routes/+page.svelte:329-333`
**Problème:** `checkExternalChanges` appelé sans vérifier si un fichier est ouvert.
**Fix:** Ajouter `if (!currentSlug) return`.

### 34. 10 résultats max dans SearchDialog
**Fichier:** `src/lib/components/SearchDialog.svelte:50-56`
**Problème:** Quand la requête est vide, 10 entrées seulement. Confusant.
**Fix:** Afficher tout ou augmenter la limite.

### 35. Perte édition si slug change pendant edit
**Fichier:** `src/lib/components/ArchetypeView.svelte:22-26`
**Problème:** `$effect` recharge l'archetype si `slug` change, perdant les edits non sauvés.
**Fix:** Demander confirmation.

### 36. `draft: true` dur dans `handleCreate`
**Fichier:** `src/routes/+page.svelte:473`
**Problème:** Les nouveaux fichiers ont toujours `draft: true`, ignorant l'archetype.
**Fix:** Utiliser le frontmatter par défaut de l'archetype.

### 37. Slug sanitization supprime les caractères non-ASCII
**Fichier:** `src/routes/+page.svelte:471`
**Problème:** `toLowerCase().replace(/[^a-z0-9]+/g, '-')` tue les accents, cyrillique, CJK.
**Fix:** Slug généré plus Unicode-aware.

### 38. Pas de Ctrl+Click sur les liens dans l'éditeur
**Fichier:** `src/lib/components/Editor.svelte` (aucun handler)
**Problème:** Cliquer un lien dans Tiptap set le curseur dedans au lieu de naviguer. Attendu : Ctrl+Click ouvre le lien.
**Fix:** Ajouter `handleClickOnLink`.

### 39. HEAD request race condition dans ImageView
**Fichier:** `src/lib/components/ImageView.svelte:38-49`
**Problème:** Pas de cleanup si `assetUrl` change vite. Plusieurs HEAD requests en compétition.
**Fix:** Ajouter `onCleanup` pour abort.

### 40. ShortcutsHelp pas de focus trap
**Fichier:** `src/lib/components/ShortcutsHelp.svelte`
**Problème:** Tab navigation peut sortir du dialogue ouvert.
**Fix:** Ajouter focus trap.

---

## Stats

| Severité | Nombre |
|----------|--------|
| Bug | 12 |
| Warning | 11 |
| Suggestion | 17 |
| **Total** | **40** |
