# Planning — Prochaines fonctionnalités

## À faire

- [ ] Langue de l'interface (Français, English) *(Nice to have)*
- [ ] Slugify : conserver les caractères non-ASCII (oui/non) — actuellement strip tout sauf a-z0-9-

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
