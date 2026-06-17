# Hugo CMS

**Hugo CMS** est une interface d'administration web pour sites [Hugo](https://gohugo.io/). Elle permet d'éditer du contenu Markdown, de gérer les archétypes, les fichiers statiques, la configuration du site, et d'interagir avec Git — le tout depuis un navigateur, avec un éditeur WYSIWYG (Tiptap) ou en mode brut.

---

## Dépendances

- **Node.js** ≥ 18 (runtime serveur)
- **Hugo** binaire dans le PATH (pour l'aperçu)
- **Git** (optionnel, pour les fonctionnalités Git)

---

## Démarrage rapide

```bash
npm install
cp .env.example .env   # puis éditer HUGO_SITE_PATH
npm run build
npm start
```

Ouvrir `http://localhost:1703`.

---

## Configuration

### Hiérarchie des sources de configuration

```
PORT système (env) > config.toml (cmsPort) > .env (PORT) > 1703 (défaut)
HUGO_SITE_PATH (env) > .env (HUGO_SITE_PATH)
```

### .env

Variables principales :

| Variable | Défaut | Rôle |
|---|---|---|
| `HUGO_SITE_PATH` | *(obligatoire)* | Racine du site Hugo |
| `PORT` | `1703` | Port du CMS |
| `HUGO_SERVER_PORT` | `1313` | Port du serveur Hugo |
| `HUGO_BIND_ADDRESS` | `127.0.0.1` | Adresse d'écoute Hugo |
| `TRASH_DIR` | `_trash` | Dossier corbeille |
| `GIT_ENABLED` | `false` | Activer Git |
| `APP_TITLE` | `Hugo CMS` | Titre affiché |

Voir `.env.example` pour la liste complète.

### Paramètres utilisateur (UI)

Les paramètres modifiables depuis l'interface (⛭ → Paramètres) sont persistés dans `~/.config/hugocms/config.toml` au format TOML. Ils surchargent `.env` quand la variable d'environnement correspondante est absente.

**Paramètres nécessitant un redémarrage :** Chemin du site, Port CMS, Dossier corbeille, Adresse bind Hugo, Port Hugo.

---

## Fonctionnalités

- **Éditeur Markdown** WYSIWYG (Tiptap) avec mode brut, bubble menu, slash commands
- **Frontmatter** éditable en formulaire ou raw YAML/TOML
- **Sidebar** multi-vues : Content, Static, Archetypes, Config
- **Onglets** multiples, glisser-déposer, rename, duplicate
- **Aperçu Hugo** en iframe, démarrage/arrêt du serveur Hugo intégré
- **Console Hugo** logs en direct
- **Git** status, commit, push (via simple-git)
- **Archétypes** liste, édition, rendu à la création
- **Détection conflits** externes (polling mtime + bannière)
- **Paramètres** schema-driven avec recherche, thèmes (Clair/Sombre/Système), police éditeur
- **Thèmes** : Catppuccin, Gruvbox, Monokai, Indigo

---

## Architecture

```
start.js / hugo-cms.exe
    │  (set PORT)
    ▼
build/index.js  (adapter-node, polka)
    │
    ▼
build/handler.js  (SvelteKit)
    │
    ├── src/routes/+page.svelte  (UI shell)
    │   ├── Sidebar, TabBar, Editor, FrontMatterEditor
    │   ├── SettingsDialog, HugoPreview, HugoConsole
    │   └── GitSidebar + dialogues
    │
    └── src/routes/api/*  (API endpoints)
        ├── /content/[slug]       → content.ts
        ├── /hugo/{start,stop,…}  → hugo.ts
        ├── /git/{status,commit}  → git.ts
        ├── /config               → config.ts
        ├── /user-settings        → user-config.ts
        └── /assets, /archetypes, /shortcodes, /directory, /browse-dir
```

Voir `ARCHITECTURE.md` pour les diagrammes C4, sequence et flow.

---

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build production SvelteKit → `build/` |
| `npm start` | Lance le CMS (start.js → build/index.js) |
| `npm run dist` | Build + bundle esbuild + compile tray → `dist/` |
| `npm test` | Tests unitaires Vitest |
| `npm run check` | TypeScript check |

---

## Distribution (portable)

```bash
npm run dist
```

Génère `dist/` contenant :

- `hugo-cms.exe` — Lanceur système (tray icon) en C#
- `bundle.mjs` — Serveur bundle (esbuild, tout inline)
- `client/` — Assets statiques
- `.env.example`

Le tray launcher lit `~/.config/hugocms/config.toml` et transmet `PORT` au processus Node. L'icône dans la barre des tâches permet d'ouvrir le navigateur, d'afficher la console, de redémarrer ou de quitter.

---

## Structure du projet

```
src/
├── lib/
│   ├── server/        # Logique serveur (config, content, hugo, git…)
│   ├── components/    # 26 composants Svelte
│   ├── settings/      # Système de paramètres (schema → SettingsPanel → SettingField)
│   └── client-config.ts
├── routes/
│   ├── +page.svelte   # UI principale
│   ├── +layout.svelte # Layout racine
│   ├── api/           # 10 endpoints REST
│   └── images/        # Servir images du content/
├── hooks.server.ts    # Handle errors + cache headers
├── app.html
├── app.css            # Thèmes CSS (Catppuccin…)
scripts/
├── dist.ps1           # Build distribution
├── tray-launcher.cs   # Tray icon C#
└── make-ico.py        # Génération .ico
```

---

## Invariants

- Le chemin du site Hugo (`HUGO_SITE_PATH`) doit pointer vers une racine Hugo valide (contient `hugo.toml`, `config.toml`, ou un dossier `config/`).
- `PORT` est lu une seule fois au démarrage du processus Node. Tout changement nécessite un redémarrage.
- Les fichiers sont déplacés vers `TRASH_DIR` (pas supprimés définitivement) sauf suppression explicite.
- La détection de conflit externe repose sur la comparaison de `mtimeMs` — écart > 1ms déclenche une bannière.
- Les paramètres utilisateur sont mergés : localStorage (app state) → TOML (settings persistants).

---

## Limites

- Mono-utilisateur (pas d'authentification).
- Pas de base de données — tout est sur le filesystem.
- L'éditeur WYSIWYG est Tiptap (ProseMirror) — certains contenus complexes (tableaux, footnotes) peuvent perdre en fidélité.
- Le serveur Hugo est spawné en child process — il doit être disponible dans le PATH.
