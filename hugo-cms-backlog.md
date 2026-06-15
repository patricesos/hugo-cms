# Backlog — Hugo Local CMS

Stack : SvelteKit · Tiptap · Node.js fs API · Hono (optionnel) · Git (phase 2)

---

## EPIC 1 — Project Setup & Architecture

### US-001 · Scaffold SvelteKit project
**Priorité :** P0  
**Effort :** S

- Initialiser SvelteKit avec `adapter-node` (pas `adapter-static` — on a besoin d'un serveur Node)
- Configurer TypeScript strict
- Configurer Vite avec HMR
- Structure de dossiers :
  ```
  /src
    /lib
      /components
      /server      ← fs utils, markdown parser
      /stores
    /routes
      /api         ← endpoints REST (lecture/écriture fichiers)
      /(cms)       ← pages de l'app CMS
  /cms.config.ts   ← config locale (chemin Hugo, etc.)
  ```
- `.env.local` pour le chemin vers le repo Hugo : `HUGO_CONTENT_PATH=/Users/.../my-site/content`

---

### US-002 · Fichier de configuration CMS
**Priorité :** P0  
**Effort :** S

- `cms.config.ts` à la racine, exportant :
  ```ts
  export default {
    hugoContentPath: process.env.HUGO_CONTENT_PATH,
    hugoStaticPath: process.env.HUGO_STATIC_PATH,
    defaultAuthor: 'patricesos',
    dateFormat: 'YYYY-MM-DD',
    git: {
      enabled: false,           // phase 2
      remote: 'origin',
      branch: 'main',
    }
  }
  ```
- Validation au démarrage : vérifier que le chemin existe, sinon afficher une erreur claire dans la console

---

### US-003 · Serveur API filesystem (routes SvelteKit)
**Priorité :** P0  
**Effort :** M

Endpoints à implémenter dans `/src/routes/api/` :

| Méthode | Route | Action |
|---|---|---|
| GET | `/api/content` | Lister tous les fichiers `.md` récursivement |
| GET | `/api/content/[...slug]` | Lire un fichier `.md` → renvoie `{ frontmatter, body }` |
| POST | `/api/content/[...slug]` | Créer un nouveau fichier `.md` |
| PUT | `/api/content/[...slug]` | Mettre à jour un fichier existant |
| DELETE | `/api/content/[...slug]` | Supprimer (déplacer vers `_trash/`, pas delete dur) |
| GET | `/api/assets` | Lister les images dans `/static/` |
| POST | `/api/assets` | Upload d'image vers `/static/images/` |

- Utiliser `gray-matter` pour parser/sérialiser le front matter YAML
- Utiliser `@iarna/toml` si le repo Hugo utilise TOML front matter
- Tous les chemins sont résolus relativement à `HUGO_CONTENT_PATH`, jamais de path traversal

---

### US-004 · Parser Markdown ↔ Tiptap JSON
**Priorité :** P0  
**Effort :** M

- Installer `tiptap-markdown` pour la sérialisation bidirectionnelle
- Mapper les nodes Tiptap → éléments Markdown Hugo :
  - `Heading` → `# ## ###`
  - `Image` → `![alt](path)` avec shortcode Hugo si besoin
  - `CodeBlock` → fenced code avec lang attribute
  - `Blockquote` → `>`
  - `BulletList` / `OrderedList` → listes standard
  - `HorizontalRule` → `---`
- Écrire des tests unitaires de round-trip : `md → tiptap JSON → md` doit être idempotent

---

## EPIC 2 — Éditeur (Tiptap + Slash Commands)

### US-010 · Intégration Tiptap de base
**Priorité :** P0  
**Effort :** M

- Installer `@tiptap/core`, `@tiptap/starter-kit`
- Composant Svelte `<Editor />` wrappant l'instance Tiptap
- Extensions de base activées : `Document`, `Paragraph`, `Text`, `History` (undo/redo)
- Bubble menu sur sélection de texte : **Gras**, *Italique*, `Code`, Lien
- Barre d'état en bas : nombre de mots, état sauvegarde (`Enregistré · il y a 3s` / `Modifications non sauvegardées`)

---

### US-011 · Slash commands menu
**Priorité :** P0  
**Effort :** L

- Utiliser l'extension `@tiptap/suggestion` + `tippy.js` pour le menu flottant
- Déclenché par `/` en début de bloc vide
- Menu filtrable par frappe (`/im` → suggère Image, `Imbriqué…`)
- Commandes à implémenter :

| Commande | Icône | Action Tiptap |
|---|---|---|
| Titre | H1 | `setHeading({ level: 1 })` |
| Sous-titre | H2 | `setHeading({ level: 2 })` |
| Titre 3 | H3 | `setHeading({ level: 3 })` |
| Texte | ¶ | `setParagraph()` |
| Image | 🖼 | Ouvre le picker d'image (US-013) |
| Citation | " | `setBlockquote()` |
| Code | `{}` | `setCodeBlock()` |
| Liste | • | `toggleBulletList()` |
| Liste numérotée | 1. | `toggleOrderedList()` |
| Séparateur | — | `setHorizontalRule()` |
| Shortcode Hugo | ⚡ | Insère un bloc `{{< >}}` custom |

- Navigation clavier : `↑ ↓` pour naviguer, `Enter` pour sélectionner, `Escape` pour fermer
- Fermeture automatique si on tape plus de 15 chars sans match

---

### US-012 · Front matter editor
**Priorité :** P0  
**Effort :** M

- Panel latéral (sidebar droite) avec les champs du front matter Hugo :
  - `title` (text input)
  - `date` (date picker, défaut : aujourd'hui)
  - `draft` (toggle — visible dans l'UI Hugo)
  - `tags` (input tag avec autocomplete basé sur les tags existants dans le repo)
  - `categories` (idem)
  - `description` (textarea, 160 chars max avec compteur)
  - `slug` (auto-généré depuis le titre, éditable manuellement)
  - `cover` (picker image optionnel)
- Changements reflétés en temps réel dans le fichier `.md` à la sauvegarde

---

### US-013 · Picker d'images / upload
**Priorité :** P1  
**Effort :** M

- Modal qui s'ouvre depuis la commande `/Image`
- Onglet **Galerie** : grid des images dans `/static/images/` (appel `GET /api/assets`)
- Onglet **Upload** : drag & drop ou clic → upload vers `/static/images/` via `POST /api/assets`
- À l'insertion : génère `![alt](path)` ou shortcode Hugo `{{< figure src="..." alt="..." >}}`
- Miniatures avec lazy loading
- Champ alt text obligatoire avant insertion

---

### US-014 · Autosave & état de sauvegarde
**Priorité :** P1  
**Effort :** S

- Autosave après 2 secondes d'inactivité (debounce)
- Indicateur visuel dans la barre d'état :
  - `●  Modifications en cours`
  - `✓  Enregistré il y a 3s`
  - `✗  Erreur d'écriture — réessayer`
- Sauvegarde manuelle via `Cmd/Ctrl+S`
- Pas de risque de perte : sauvegarde dans un fichier `.draft` temporaire avant d'écraser le `.md`

---

### US-015 · Undo/redo & historique
**Priorité :** P2  
**Effort :** S

- Undo/redo natif Tiptap (`History` extension) : `Cmd+Z` / `Cmd+Shift+Z`
- Optionnel phase 2 : historique de versions (liste des 10 derniers états avec timestamp, stockés dans `/.cms-history/`)

---

## EPIC 3 — Navigation & gestion du contenu

### US-020 · Sidebar de navigation des fichiers
**Priorité :** P0  
**Effort :** M

- Arborescence du dossier `/content/` Hugo, reflétant la structure réelle
- Sections Hugo affichées comme dossiers (`/blog/`, `/projects/`, `/pages/`)
- Clic sur un fichier → ouvre dans l'éditeur
- Badge `DRAFT` sur les fichiers avec `draft: true`
- Badge `●` sur les fichiers modifiés non sauvegardés
- Bouton `+ Nouveau` par section

---

### US-021 · Création d'un nouveau fichier
**Priorité :** P0  
**Effort :** S

- Modal : choisir la section (dropdown des dossiers existants), saisir le titre
- Génère automatiquement :
  - Le slug (`mon-titre` → `mon-titre.md`)
  - Le front matter minimal avec `date`, `draft: true`, `title`
  - Ouvre directement dans l'éditeur

---

### US-022 · Renommer / déplacer un fichier
**Priorité :** P2  
**Effort :** S

- Double-clic sur le nom dans la sidebar → renommage inline
- Drag & drop entre sections pour déplacer (renomme le chemin, met à jour le slug)

---

### US-023 · Suppression (soft delete)
**Priorité :** P1  
**Effort :** S

- `Delete` ou bouton dans le menu contextuel → déplace dans `/_trash/` avec timestamp
- Confirmation dialog avant action
- Pas de suppression permanente depuis l'UI CMS (protection contre les erreurs)

---

### US-024 · Recherche de contenu
**Priorité :** P2  
**Effort :** M

- Barre de recherche `Cmd+K` : recherche dans les titres et le body des fichiers
- Index construit en mémoire au démarrage (pas de DB), rechargé à chaque changement de fichier
- Résultats avec extrait de contexte autour du match

---

## EPIC 4 — Preview Hugo

### US-030 · Intégration Hugo server
**Priorité :** P1  
**Effort :** M

- Bouton **Preview** dans la toolbar → ouvre un iframe ou un nouvel onglet sur `localhost:1313` (port Hugo)
- Option dans `cms.config.ts` : `hugoServerPort: 1313`
- Détection automatique si `hugo server` est déjà lancé (ping `localhost:1313`)
- Si non lancé : message dans l'UI avec la commande à lancer (`hugo server -D`)
- Phase 2 : lancer `hugo server` directement depuis l'app via `child_process.spawn`

---

### US-031 · Split view editor / preview
**Priorité :** P3  
**Effort :** L

- Layout 50/50 : éditeur à gauche, iframe Hugo preview à droite
- Rechargement automatique du preview à chaque autosave

---

## EPIC 5 — Git (Phase 2)

### US-040 · Activation Git dans la config
**Priorité :** P2  
**Effort :** S

- `cms.config.ts` : `git.enabled = true`
- Détection si le dossier Hugo est un repo git (`fs.existsSync('.git')`)
- Affichage du statut git dans la status bar : branche courante, nombre de fichiers modifiés

---

### US-041 · Commit & push depuis l'UI
**Priorité :** P2  
**Effort :** M

- Panneau Git (icône dans sidebar gauche) :
  - Liste des fichiers modifiés (staging area simplifiée)
  - Champ message de commit (pré-rempli : `cms: update [filename]`)
  - Bouton `Commit` → `git add . && git commit -m "..."`
  - Bouton `Publier` → `git push origin main`
- Utiliser `simple-git` (wrapper Node.js, pas d'exécution de shell raw)

---

### US-042 · Support multi-remote (GitHub, Codeberg, self-hosted)
**Priorité :** P3  
**Effort :** M

- Config dans `cms.config.ts` : `git.remote` peut pointer vers n'importe quel remote
- Auth via SSH key (système) ou token HTTPS stocké dans `.env.local` — jamais hardcodé

---

## EPIC 6 — UX & polish

### US-050 · Thème UI du CMS
**Priorité :** P1  
**Effort :** M

- Palette cohérente avec le site perso (crème chaud / gris / typographie humaniste)
- Mode sombre automatique (system preference)
- Layout : sidebar 260px fixe à gauche, éditeur centré max-width 720px, sidebar front matter 280px à droite (collapsible)
- Typographie éditeur : serif pour le body de l'article, monospace pour les blocs code

---

### US-051 · Raccourcis clavier
**Priorité :** P1  
**Effort :** S

| Raccourci | Action |
|---|---|
| `Cmd+S` | Sauvegarde manuelle |
| `Cmd+K` | Recherche globale |
| `Cmd+N` | Nouveau fichier |
| `Cmd+P` | Preview Hugo |
| `Cmd+\` | Toggle sidebar |
| `/` | Slash menu (dans l'éditeur) |
| `Cmd+Z / Shift+Z` | Undo / Redo |

---

### US-052 · Notifications & toasts
**Priorité :** P2  
**Effort :** S

- Toast système non-bloquant pour :
  - `Fichier créé`
  - `Modifications sauvegardées`
  - `Image uploadée`
  - `Erreur : [détail]`
- Durée 3s, disparition automatique

---

## EPIC 7 — Packaging & distribution

### US-060 · Lancement en une commande
**Priorité :** P1  
**Effort :** S

- Script npm : `npm run cms` → démarre le serveur SvelteKit sur `localhost:3000`
- README avec les 3 étapes d'installation :
  1. `npm install`
  2. `cp .env.example .env.local` + renseigner `HUGO_CONTENT_PATH`
  3. `npm run cms`

---

### US-061 · Packaging Electron (optionnel, phase 3)
**Priorité :** P3  
**Effort :** XL

- Wrapper Electron pour avoir une vraie app desktop (icône dans le dock, pas besoin d'ouvrir un terminal)
- `electron-builder` pour les builds macOS / Windows
- Auto-lancement de `hugo server` depuis Electron au démarrage

---

## Ordre d'implémentation suggéré

```
Sprint 1 — Foundation
  US-001 · US-002 · US-003 · US-004

Sprint 2 — Éditeur core
  US-010 · US-011 · US-012 · US-014

Sprint 3 — Fichiers & navigation
  US-020 · US-021 · US-023 · US-060

Sprint 4 — Assets & preview
  US-013 · US-030 · US-050 · US-051

Sprint 5 — Git & polish
  US-040 · US-041 · US-022 · US-024 · US-052
```

---

*Dernière mise à jour : juin 2026*
