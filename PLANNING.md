# Planning — Prochaines fonctionnalités

## Sprint 6

- [x] Git intégré (commit/push depuis le CMS)
- [x] Persistance de l'état éditeur après refresh (onglets, dossiers ouverts…)
- [x] Nouvelle vue Config : éditer tous les fichiers du dossier config/ (hugo.toml, params, menus…)
- [x] Sidebar : position des icônes de vue (en bas) alignée avec le nombre total d'icônes à gauche (taille totale)
- [ ] À peaufiner : améliorer le système de vues (config, search, drag-drop entre vues…)


## Menu Paramètres

Menu de paramètres accessible depuis l'interface (icône ⚙ ou gear dans le header).

### Apparence

- [ ] Sélecteur de thèmes (Clair, Sombre, Système) — palettes : Gruvbox, Catppuccin, Monokai, Indigo
- [ ] Police éditeur (Open Sans, monospace, Georgia, system-ui)
- [ ] Taille de police éditeur (petite, normale, grande)
- [ ] Largeur max du contenu éditeur (720px / 100% / custom)
- [ ] Langue de l'interface (Français, English)

### Éditeur

- [ ] Mode éditeur par défaut (WYSIWYG / Markdown brut)
- [ ] Délai auto-save (ms) — actuellement 2000ms via FM_SAVE_DELAY / AUTO_SAVE_DELAY
- [ ] Activer/désactiver le bubble menu
- [ ] Activer/désactiver le slash menu
- [ ] Nombre max d'entrées dans l'historique undo/redo
- [ ] Draft par défaut pour les nouveaux fichiers (oui/non)

### Panneaux

- [ ] Sidebar ouverte par défaut (oui/non)
- [ ] Largeur sidebar par défaut (min 180, max 500)
- [ ] Vue sidebar par défaut (Content / Static / Archetypes / Config)
- [ ] Panneau Frontmatter ouvert par défaut (oui/non)
- [ ] Largeur Frontmatter par défaut (min 200, max 500)
- [ ] Mode Frontmatter par défaut (formulaire / raw)
- [ ] Console Hugo ouverte par défaut (oui/non)
- [ ] Aperçu Hugo ouvert par défaut (oui/non)

### Git

- [ ] Git intégré activé (oui/non)
- [ ] Remote par défaut (origin / custom)
- [ ] Branche par défaut (main / custom)
- [ ] Afficher panneau Git par défaut (oui/non)

### Avancé — visible dans la vue Config ou un sous-menu

- [ ] Chemin Hugo site (read-only, depuis .env)
- [ ] Port serveur Hugo (1313 par défaut)
- [ ] Adresse bind Hugo (127.0.0.1 par défaut)
- [ ] Timeout démarrage Hugo (15000ms)
- [ ] Timeout arrêt Hugo (5000ms)
- [ ] Intervalle polling changements externes (5000ms)
- [ ] Dossier Corbeille (\_trash)
- [ ] Auteur par défaut (patricesos)
- [ ] Format de date (YYYY-MM-DD)
- [ ] Archétype par défaut (default)
- [ ] Slugify : conserver les caractères non-ASCII (oui/non) — actuellement strip tout sauf a-z0-9-


## Backlog

- [ ] Split view 50/50 éditeur + aperçu (auto-reload sur sauvegarde)
- [ ] Multi-remote git dans l'UI
- [ ] Version history (10 dernières versions dans /.cms-history/)
- [ ] Drag-drop entre les vues sidebar
- [ ] Recherche dans la vue Config


## Done

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
