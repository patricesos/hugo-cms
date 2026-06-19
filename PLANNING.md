# Planning — Prochaines fonctionnalités

## En cours — Architecture config

- [x] **PROBLÈME 1** — `buildConfig()` : fallbacks git enabled/remote/branch utilisent maintenant `userSettings.showGit`/`gitRemote`/`gitBranch` au lieu de valeurs hardcodées
- [x] **PROBLÈME 2** — `validate.ts` : `validateSettingValue()` + `allSettingKeys()` pilotés par `settingsSchema`. Rewrite `loadUserSettings()`/`saveUserSettings()` sans duplication
- [x] **PROBLÈME 3** — `PUT /api/user-settings` : validation JSON body, type object, clés connues, valeurs valides → 400
- [x] **VALIDATION** — `npx vitest run` → 110/110

### En cours — Fix testabilité

- [x] **FIX 1** — `Editor.test.ts` : ajouter `Image` au mock `@lucide/svelte`
- [x] **FIX 2.1** — `config.ts` : `getCmsConfig()` + `__setCmsConfigForTests()`
- [x] **FIX 2.2** — `content.ts` : `BASE`/`TRASH_DIR` → fonctions paresseuses
- [x] **FIX 2.3** — `git.ts` : `repoRoot`/`simpleGit` paresseux
- [x] **FIX 2.4** — `hugo.ts` : `cmsConfig` → `getCmsConfig()`
- [x] **FIX 2.5** — `shortcodes.ts` : `cmsConfig` → `getCmsConfig()`
- [x] **FIX 2.6** — `config-files.ts` : `CONFIG_DIR` → fonction paresseuse
- [x] **FIX 2.7** — `archetypes.ts` : `ARCHETYPES_DIR` → fonction paresseuse
- [x] **FIX 2.8a** — Route `api/content/[...slug]` : `cmsConfig` → `getCmsConfig()`
- [x] **FIX 2.8b** — Route `api/config` : `cmsConfig` → `getCmsConfig()`
- [x] **FIX 2.8c** — Route `api/assets` : `cmsConfig` → `getCmsConfig()`
- [x] **FIX 2.8d** — Route `images/[...path]` : `cmsConfig` → `getCmsConfig()`
- [x] **FIX 2.8e** — Route `api/assets/[...path]` : `cmsConfig` → `getCmsConfig()`
- [x] **FIX 2.9** — `content.test.ts` : setup avec `__setCmsConfigForTests()`
- [x] **Validation finale** — `npx vitest run` → 37/37
- [x] **FIX 3 — Shortcode round-trip** — Extraction de `shortcode-utils.ts`: `protectShortcodes()`, `restoreShortcodes()`, `splitShortcodeLines()`. `breaks: false` dans markdown-it. 21 tests unitaires.
- [x] **FIX 4 — Tests user-config** — `user-config.test.ts` : 11 tests couvrant `loadUserSettings` (fichier manquant, vide, fusion, valeurs invalides, TOML invalide, clés inconnues), `saveUserSettings` (écriture, clés invalides, types), round-trip save→load.
- [x] **FIX 5 — Tests buildConfig** — `config.test.ts` : 16 tests pour `buildConfig()` — fallback userSettings (git, ports, paths), surcharge env vars, valeurs absolues, env vide.
- [x] **FIX 6 — Tests archetypes** — `archetypes.test.ts` : 29 tests — CRUD complet (read/create/update/delete), list (tri, cachés, labels, tree), render (tous les remplacements Hugo).

## Backlog — Polish UI : cohérence du design system

**Ordre :** PROBLÈME 1 (couleurs) → PROBLÈME 2 (border-radius) → PROBLÈME 3 (`.btn-primary`, optionnel).

---

### PROBLÈME 1 — Couleurs sémantiques hardcodées (cassées en dark mode)

- [x] **1.1** — Ajouter les tokens de fond manquants dans `app.css` (`--c-success-bg`, `--c-warning-bg`, `--c-danger-bg`, `--c-*-border`) en light et dark
- [x] **1.2** — Migrer `StatusBar.svelte`, `SitemapView.svelte` vers les tokens
- [x] **1.3** — Migrer `ArchetypeView.svelte`, `ConfigView.svelte`, `SitemapTreeItem.svelte`, `TreeNode.svelte`
- [x] **1.4** — Migrer `FrontMatterEditor.svelte`, `GitSidebar.svelte`, `CommitDialog.svelte`
- [x] **1.5** — Migrer `HugoPreview.svelte`, `+page.svelte`
- [x] **1.6** — Ajouter commentaire `/* Console toujours en thème sombre */` dans `HugoConsole.svelte` et vérifier `Editor.svelte:686-687`
- [x] **1.7** — Validation visuelle dark mode + `npx vitest run` → 189/189

---

### PROBLÈME 2 — border-radius incohérent avec les tokens existants

- [x] **2.1** — Lister toutes les occurrences `border-radius: [0-9]` dans les `.svelte`
- [x] **2.2** — Remplacer : `4px → var(--radius-sm)`, `6px → var(--radius-md)`, `3px → var(--radius-sm)`, `10px → var(--radius-xl)`
- [x] **2.3** — `npx vitest run` → 189/189

---

### PROBLÈME 3 — Duplication pattern `.btn-primary` (optionnel)

- [x] **3.1** — Ajouter classe `.btn-primary` dans `app.css`
- [x] **3.2** — Supprimer les 5 définitions locales, remplacer `class="btn primary"` → `class="btn-primary"`

---

## Backlog — Prochains EPICs

**Ordre d'implémentation :** EPIC C → A → B → D. Chaque EPIC dans une session/commit séparée.

---

### EPIC A — Création d'un nouveau site Hugo depuis la web app

- [x] **US-080** — Détection de l'absence de site Hugo valide au démarrage (ne plus throw dans `getCmsConfig()`, flag `siteValid`, gardes explicites dans les appelants)
- [x] **US-081** — Endpoint `POST /api/hugo/new-site` (spawn `hugo new site`, validation dossier existant non-vide, mise à jour config)
- [x] **US-082** — UI `NewSiteDialog.svelte` (modal cohérent avec Settings/ImagePicker, appel POST, loading/error/success)

---

### EPIC B — UI taskbar : run/stop Hugo + couleur d'état + expose réseau

- [x] **US-083** — Indicateur d'état Hugo unifié avec couleur (icône gris/orange/vert/rouge dans `action-bar-right`, toggle run/stop au clic, tooltip dynamique)

---

### EPIC C — Folder picker custom (remplacer le dialogue natif Windows)

- [x] **US-084** — Endpoint `GET /api/browse-dir` (liste sous-dossiers, sécurité navigation, Windows drives)
- [x] **US-085** — Composant `FolderPicker.svelte` (modal, fil d'ariane, sélection, champ saisie manuelle)
- [x] **US-086** — Brancher FolderPicker dans SettingsDialog via SettingField (type: 'folder')

---

### EPIC D — Syntax highlighting léger en mode raw

- [x] **US-090** — Décision d'architecture : CodeMirror 6 (Option 1) vs overlay (Option 2). À trancher AVANT tout code.
- [x] **US-091** — Intégration CodeMirror 6 en mode raw (migration progressive fonction par fonction, validation manuelle après chaque migration)
- [x] **US-092** — Tests de non-régression pour le mode raw migré (Editor.test.ts avec CodeMirror en environnement Vitest)

---

## Backlog — Audit Pattern Violations (18 Jun 2026)

> Branche : `audit/pattern-violations`
> Statut : 47 issues identifiées — 3 critiques, 25 moyennes, 19 basses
> Fixes appliqués : 23/47 (3 critiques, 14 moyennes, 6 basses)

---

### EPIC E — Architecture SvelteKit (CRITIQUE)

#### God Component `+page.svelte`

- [x] **E-001** — 🔴 `+page.svelte` = 2064 lignes, 60+ variables d'état, 40+ fonctions — **violation SRP**. Découper en modules : `tabs`, `sidebar`, `git`, `hugo`, `settings`, `editor`, `search`, `create-delete`
- [x] **E-002** — 🔴 Aucun store Svelte — 60+ `let xxx = $state(...)` au lieu de stores dédiés (`settingsStore`, `tabsStore`, `hugoStore`, `gitStore`)
- [x] **E-003** — 🟡 `saveAppState()` reconstruit un objet de 30+ champs manuellement — duplication du schema entre `saveAppState`, `restoreAppState`, et le callback `onSave`
- [x] **E-004** — 🟡 `restoreAppState()` fait 40+ `if (s.xxx !== undefined) xxx = s.xxx as type` — devrait être un `Object.assign()` avec un type safely
- [x] **E-005** — 🟡 Composants lazy-loaded typés `$state<any>(null)` — 12 composants sans type safety
- [x] **E-006** — 🟡 `onSave` du SettingsDialog reçoit un objet inline de 30+ champs — le type est écrit en dur dans le template
- [x] **E-007** — 🟡 `$effect` pour `saveAppState` avec 35+ dépendances listées manuellement — risque d'oubli

#### Duplications de Types

- [x] **E-008** — 🟡 `TreeNode` défini dans `types.ts` ET re-défini dans `+page.svelte:12-19` — devrait import depuis `$lib/server/types`
- [x] **E-009** — 🟡 `safeResolveBase()` duplique `safeResolveIn()` — `api/content/[...slug]/+server.ts:10-17` vs `content.ts:18-25`
- [x] **E-010** — 🟢 `TabKind` et `Tab` interface redéfinis localement — devraient être dans un fichier partagé

#### Extraction `+page.svelte` (session juin 2026)

- [x] **E-011** — 🟢 Restaurer `currentTab`/`handleCreate` dans `editorStore`, déléguer depuis `+page.svelte`
- [x] **E-012** — 🟢 Restaurer 5 derived stores Hugo dans `hugoStore`, consommer depuis `+page.svelte` (fini `$hugoStore.x`)
- [x] **E-013** — 🟢 Extraire `conflict.ts` (polling externes, resolve, visibility change)
- [x] **E-014** — 🟢 Extraire `fileTree.svelte.ts` (arbres + loaders + derives directories/searchEntries)
- [x] **E-015** — 🟢 Extraire `restoreAppState()` dans `restore.ts` (utilitaire multi-stores, comme `conflict.ts`)
- [x] **E-016** — 🟢 Extraire `handleFrontmatterChange()` dans `editorStore`

---

### EPIC F — Patterns Serveur & API

#### I/O Synchrone vs Asynchrone

- [x] **F-001** — 🟡 `existsSync()` mélangé avec des fonctions async dans `content.ts` (7 occurrences) — bloquer l'event loop
- [x] **F-002** — 🟡 `readFileSync` dans `config.ts:33` — documenté dans le code (commentaire). Fichier <1KB, une seule fois au démarrage, ~5ms. Convertir en async nécessiterait 39 call sites + 9 fonctions sync à refaire — coût déraisonnable.
- [x] **F-003** — 🟢 `shortcodes.ts:108-110` — déjà fixé : `Promise.all()` + `map()` async = lectures concurrentes

#### Patterns de Cache & État Global

- [x] **F-004** — 🟡 `let _cmsConfig` — cache invalidé via `resetCmsConfig()` après `saveUserSettings()`
- [x] **F-005** — 🟢 Cache Git invalidé via `resetGit()` après `saveUserSettings()`
- [x] **F-006** — 🟡 7 variables globales mutable dans `hugo.ts` — déjà encapsulées dans un objet `state`
- [x] **F-007** — 🟢 `resetGit()` renommé (ex-`__resetGitForTests`), utilisé en prod. Les autres `__*` gardent leur préfixe — pattern de test standard.
#### Gestion d'Erreurs API

- [x] **F-008** — 🟡 Pas de validation du body JSON — déjà validé dans les deux endpoints (message/files pour git, bindAddress pour hugo)
- [x] **F-009** — 🟢 Routes Hugo retournent 200 en erreur — aucun cas trouvé (tous les `json({ error })` ont un status explicite)
- [x] **F-010** — 🟢 Incohérence `error()` vs `json({ error })` — `config/[...path]/+server.ts` unifié vers `json({ error }, { status })`

---

### EPIC G/H/I/J — Abandonné (hors scope pour cette session)

- [ ] G/H/I/J sont des tickets sur le thème Hugo, le contenu, les workflows — pas dans le scope actuel du refactor CMS.

### EPIC K — Bugs (8, tous déjà fixés par le refactor E/F)

- [x] **K-001** — 🟡 Renommer clé FM peut en écraser une autre — déjà protégé par `if (newKey in local)` dans `updateCustomKey()`
- [x] **K-002** — 🟡 Changement FM seul ne trigger pas auto-save — déjà géré par `fmSaveTimeout` debounce dans `+page.svelte`
- [x] **K-003** — 🟢 `tree = tree` hack — disparu avec la migration vers `fileTreeStore`
- [x] **K-004** — 🟢 Racine Hugo limitée à 2 niveaux — fonction simplifiée (code mort retiré)
- [x] **K-005** — 🟢 Imports inutilisés (`RotateCcw`)
- [x] **K-006** — 🟡 `readdirSync`/`readFileSync` dans `shortcodes.ts` — déjà remplacés par leurs versions async
- [x] **K-007** — 🟢 Switch raw↔WYSIWYG re-parse la FM — déjà optimisé via `prevFmSnapshot`
- [x] **K-008** — 🟢 10 résultats max dans SearchDialog — limite déjà supprimée
- [x] **K-009** — 🟢 `draft: true` dur dans `handleCreate` — déjà paramétré via `$settings.draftByDefault`
- [x] **K-010** — 🔴 Éditeur figé après toggle raw↔wysiwyg + changement d'onglet rapprochés. Cause racine : `cmView` est un `let` brut, pas `$state` → l'effect de sync (410) ne réagit pas à sa transition `null` → instance. Fix : `let cmView = $state<EditorView | null>(null)`, `untrack(() => cmView)` dans l'effect lifecycle pour éviter la boucle. + test de régression (toggle rawMode + content simultanés, vérifier DOM CodeMirror).

---

## Backlog — Sélecteur de thème Hugo simplifié

**Hypothèses (à valider avec l'utilisateur avant de coder) :**
- Liste fixe de thèmes pré-testés (pas d'URL GitHub arbitraire)
- Avertissement avant installation si conflit/shortcode potentiellement non supporté

**Ordre d'implémentation :** US-100 → US-101 → US-102 → US-103 (séquentiel).

---

---

### EPIC M — Round-trip raw ↔ WYSIWYG fiable

> **Branche :** `audit/pattern-violations`
> **Statut :** 4 problèmes identifiés, ordre d'implémentation : 1 → 3 → 4 → 2
> **Contexte :** Le round-trip raw ↔ WYSIWYG altère silencieusement le contenu :
> shortcodes `%` perdus (les plus graves car silencieux), dates reformatées,
> whitespace normalisé, commentaires YAML effacés. Hugo ne signale pas d'erreur
> pour les shortcodes — le site s'affiche avec un rendu plat.

- [x] **M-001** — 🔴 Shortcodes `{{% %}}` corrompus en `{{< >}}` au round-trip.
  **Cause :** `protectShortcodes()` mappe `>}}` ET `%}}` sur le même token
  `SH_CLOSE_SH`. `restoreShortcodes()` ne peut pas distinguer → restaure
  toujours `>}}`. **Fix :** deux tokens distincts (`SH_CLOSE_ANGLE`,
  `SH_CLOSE_PERCENT`), adapter `splitShortcodeLines()`.
  **Tests :** round-trip `%` seul, mélange `%` + `<`, shortcodes imbriqués dans
  le body.

- [x] **M-002** — 🟡 Commentaires YAML dans le frontmatter perdus silencieusement
  au round-trip. **Cause :** `yaml.load()` / `yaml.dump()` ne préserve pas les
  commentaires. **Fix :** détection à l'ouverture + avertissement non bloquant
  dans la console éditeur. Résolution complète nécessiterait un parseur YAML
  préservant les commentaires.

- [x] **M-003** — 🟡 Dates reformatées au round-trip (ex : `2026-06-19` →
  `2026-06-19T00:00:00.000Z`). **Cause :** `yaml.dump()` sérialise les objets
  `Date` en ISO, la valeur Hugo en YAML était une string brute.
  **Fix :** normaliser les valeurs `Date` en string `YYYY-MM-DD` avant
  `yaml.dump()` dans `serializeFm()`. Clés Hugo concernées : `date`,
  `lastmod`, `publishDate`, `expiryDate`.

- [x] **M-004** — 🟢 Whitespace entre frontmatter et corps normalisé
  silencieusement. La logique `splitRawContent()` force `\n\n` fixe. Ce n'est
  pas un bug mais un choix de normalisation non documenté.
  **Fix :** commentaire dans le code + documentation (`ARCHITECTURE.md` ou
  `LIMITATIONS.md`). Aucun changement de comportement.

### EPIC L — Refactor coordination raw/wysiwyg (après fix K-010)

> **Ne PAS faire en même temps que K-010.** Refactor séparé, dans son propre commit, une fois le fix validé.
> Contexte : K-010 est le 2e bug dans la même zone de `Editor.svelte` (body perdu en rawMode était le 1er).
> La fragilité vient du mélange `let` brut + `$state` + flags de coordination manuels entre 4 `$effect`.

- [x] **L-001** — 🟡 Extraire la logique de synchronisation raw/wysiwyg dans `src/lib/editor/mode-sync.svelte.ts`. API : `resetAction()`, `handleContentChangeAction()`, `handleRawModeChangeActionWithRaw()`, `handleFrontmatterChangeAction()`. Pas de `$state` exporté (évite "Cannot assign to import"). Retourne des `ContentAction` que Editor.svelte applique.
- [x] **L-002** — 🟡 Les 3 `$effect` entremêlés d'`Editor.svelte` (content + rawMode + frontmatter) sont remplacés par 2 `$effect` qui délèguent à mode-sync. Plus de flags de coordination manuels entre effets. Le `$effect` unique combine content+rawMode dans le bon ordre.
- [x] **L-003** — 🟢 25 tests unitaires sur mode-sync (helpers + actions + régressions), `@vitest-environment node`, 0 DOM.
- [x] **L-004** — 🟢 Tests de régression K-010 : "toggle rawMode après content change → skip (contentUpdatedByEffect actif)", "content change seul en rawMode → newRawContent", "toggle rawMode SEUL → capture depuis Tiptap".

---

### EPIC N — Isoler RawEditor / WysiwygEditor + store de coordination

> **Branche :** `audit/pattern-violations` (après EPIC M)
> **Prérequis :** EPIC M (M-001 à M-004) terminé — ce refactor déplace du code, il ne doit pas aussi corriger des bugs.
> **Problème :** `Editor.svelte` (839 lignes) entremêle CodeMirror, Tiptap, shortcodes, frontmatter — c'est la cause racine des bugs de coordination (K-010, L-001). Deux systèmes d'effects qui se chevauchent.
> **Solution :** 3 couches — store (`mode-sync.svelte.ts` seul endroit qui connaît la conversion), deux vues (`RawEditor.svelte`, `WysiwygEditor.svelte` ignorantes l'une de l'autre), un orchestrateur réduit (`Editor.svelte` ~150-250 lignes).

- [x] **US-110** — 🔴 Store `mode-sync.svelte.ts` en classe `ModeSync` avec `$state` et API explicite (`loadContent`, `toggleToRaw`, `toggleToWysiwyg`, `handleFrontmatterChange`). Plus de flag `_contentUpdatedByEffect`. 34 tests (34 sans DOM). Editor.svelte adapté : orchestration explicite dans le `$effect` combiné. 325 tests verts.

- [ ] **US-111** — 🔴 Extraire `RawEditor.svelte` : montage/démontage CM6, extensions, `cmView`/`cmUpdating`. Contrat : `content` en prop, `onChange` en sortie. Ignore Tiptap, shortcodes, frontmatter.

- [ ] **US-112** — 🔴 Extraire `WysiwygEditor.svelte` : `buildEditor`, bubble/slash menu. `getMarkdown()` retourne le markdown Tiptap brut sans `restoreShortcodes` — c'est le store qui applique la conversion.

- [ ] **US-113** — 🔴 Réduire `Editor.svelte` à l'orchestrateur : bascule `<RawEditor>`/`<WysiwygEditor>`, auto-save (transverse), image picker/shortcode dialog (transverse), appel explicite à `loadExternalContent()` au changement d'onglet.

- [ ] **US-114** — 🔴 Migrer les tests : les 4 tests WYSIWYG → `WysiwygEditor.test.ts` ; les tests CM6 purs → `RawEditor.test.ts` ; les tests de bascule → orchestrateur ou (mieux) store `mode-sync.test.ts`. Checklist des 13 tests existants.

**Décisions architecturales documentées dans le backlog complet :**
- `WysiwygEditor` ne doit PAS appliquer `restoreShortcodes`/`splitShortcodeLines` — c'est le rôle du store
- `RawEditor` reçoit la string déjà composée fm+body — pas de connaissance du frontmatter
- L'image picker et le shortcode dialog restent au niveau orchestrateur (transverse aux deux modes)
- Le store `createModeSync()` peut être instancié par `Editor.svelte` (pas global — un store par instance d'éditeur)
- `_contentUpdatedByEffect` DOIT disparaître — si l'API du store le réclame, c'est que l'API n'est pas assez explicite

**Ordre :** US-110 → US-111 + US-112 (parallèle) → US-113 → US-114. `npx vitest run` vert à chaque étape.

### EPIC THEME — Installation de thème en un clic (liste fixe pré-testée)

- [ ] **US-100** — Catalogue de thèmes pré-testés (`src/lib/server/theme-catalog.ts`, liste statique, test manuel obligatoire de chaque thème avec les shortcodes custom réels avant ajout)
- [ ] **US-101** — Détection de conflit shortcodes avant installation (`detectShortcodeConflicts()` dans `theme-install.ts`, liste `providedShortcodes` maintenue à la main par thème)
- [ ] **US-102** — Endpoint `POST /api/hugo/theme/install` (validation themeId, sauvegarde config avant modification, gestion erreurs réseau/binaire manquant/format config, rollback possible via `.cms/backups/`)
- [ ] **US-103** — UI `ThemeSelector.svelte` (modal grille de cartes, preview image, avertissement conflit, confirmation, état chargement, accessible depuis Settings)

---

### Ancien backlog (future lointain)

- [ ] Split view 50/50 éditeur + aperçu (auto-reload sur sauvegarde)
- [ ] Multi-remote git dans l'UI
- [ ] Version history (10 dernières versions dans /.cms-history/)
- [ ] Drag-drop entre les vues sidebar
- [ ] Recherche dans la vue Config
- [ ] Langue de l'interface (Français, English)
- [ ] Slugify : conserver les caractères non-ASCII (oui/non)

## Done

- [x] Port CMS (1703 par défaut, redémarrage requis)
- [x] Git intégré (commit/push depuis le CMS)
- [x] Persistance de l'état éditeur après refresh (onglets, dossiers ouverts…)
- [x] Nouvelle vue Config : éditer tous les fichiers du dossier config/ (hugo.toml, params, menus…)
- [x] Sidebar : position des icônes de vue (en bas) alignée avec le nombre total d'icônes à gauche (taille totale)
- [x] Refactoring settings : schema-driven avec onglets + recherche, composant SettingField générique, dialog élargi à 520px
- [x] Menu Paramètres — Apparence : Sélecteur de thèmes, Police/Taille/ Largeur éditeur
- [x] Menu Paramètres — Éditeur : mode brut, auto-save, bubble/slash menu, historique, draft
- [x] Menu Paramètres — Panneaux : sidebar/FM/console/aperçu ouverts par défaut + largeurs
- [x] Menu Paramètres — Git : activé, remote, branche, affichage panneau
- [x] Menu Paramètres — Avancé : site path, ports Hugo, bind address, timeouts, corbeille, port CMS, auteur, date, archétype
- [x] Bouton Aperçu déplacé dans la barre d'actions ; bouton Supprimer retiré de l'en-tête éditeur
- [x] ImageView : prévisualisation des images dans l'éditeur
- [x] Barre d'actions sous le header (sidebar toggle + fm toggle aux extrémités, boutons d'action centrés)
- [x] FM header : déplacer le titre au-dessus des actions
- [x] Champs personnalisés dans le frontmatter (clé/valeur)
- [x] Boutons Image et Shortcode dans la barre d'outils de l'éditeur
- [x] Afficher / éditer le frontmatter en mode raw (éditeur YAML/TOML brut)
- [x] Déplacer un fichier entre sections (drag & drop)
- [x] Renommer un fichier
- [x] Draft/Publish toggle dans le frontmatter
- [x] Masquer/afficher la sidebar (toggle)
- [x] Sidebar redimensionnable (poignée de glissement)
- [x] Bascule éditeur WYSIWYG / Markdown brut
- [x] Onglets multiples (plusieurs fichiers ouverts)
- [x] Dupliquer un fichier
- [x] Aperçu Hugo (ouvrir le site dans un onglet)
- [x] Création d'articles via archétypes (sélection d'archetype dans le dialogue Nouveau fichier)
- [x] Afficher / gérer les archétypes dans l'app (visualisation + édition)
- [x] Création de dossier [+] depuis la sidebar
- [x] Afficher le dossier static (images, fichiers) dans la sidebar
- [x] Réorganiser le dialogue Nouveau fichier : Titre / Archétype / Section
- [x] Déplacer « Hugo CMS » du sidebar vers le header (barre du haut)
- [x] Logo Hugo SVG en fond quand aucun fichier n'est ouvert
- [x] Résoudre conflit Ctrl+K (lien Tiptap vs recherche) — utiliser Ctrl+Shift+F pour la recherche
- [x] Panneau Front Matter redimensionnable (poignée de glissement)
- [x] Clic molette (middle click) pour fermer un onglet
- [x] Icône [+] sur chaque dossier dans la sidebar pour créer un fichier directement
- [x] Ajouter du padding à gauche dans la sidebar
- [x] Sélecteur de vue sidebar : Content / Static (onglets)
- [x] Bubble menu de l'éditeur — ne s'afficher que quand du texte est sélectionné
- [x] Sauvegarde manuelle depuis le header (icône Save/Check/Loader)
- [x] Détection modification externe (mtime + polling + bannière conflit)
- [x] Sitemap visuel
