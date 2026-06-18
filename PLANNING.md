# Planning — Prochaines fonctionnalités

## À faire

- [ ] Langue de l'interface (Français, English) *(Nice to have)*
- [ ] Slugify : conserver les caractères non-ASCII (oui/non) — actuellement strip tout sauf a-z0-9-

### En cours — Architecture config

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

## Backlog

- [ ] Split view 50/50 éditeur + aperçu (auto-reload sur sauvegarde)
- [ ] Multi-remote git dans l'UI
- [ ] Version history (10 dernières versions dans /.cms-history/)
- [ ] Drag-drop entre les vues sidebar
- [ ] Recherche dans la vue Config

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

