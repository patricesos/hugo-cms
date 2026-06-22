---
name: hugo-cms-rules
description: Règles du projet PGS Hugo CMS — commit, planning, conventions
trigger: always
---

# hugo-cms-rules

## Comportement

- Ne jamais commit automatiquement. Attendre l'ordre explicite "commit".
- Pas de `git add` ni `git commit` sans instruction directe.
- Après chaque commit, cocher les items correspondants dans PLANNING.md (remplacer `- [ ]` par `- [x]`).
- Toujours être verbeux : noms de variables, classes, fonctions explicites.
- Commentaires de code en français (expliquer le *pourquoi*, pas le *quoi*).
- Le code lui-même est en anglais (noms, signatures, messages).
- Agir en sensei : expliquer le raisonnement, les alternatives, les trade-offs.
- **Toute implémentation touchant plusieurs fichiers** (même une seule fonctionnalité logique) doit commencer par une `todowrite` listant les fichiers/étapes avec leur statut (`pending` / `in_progress` / `completed`). Mettre à jour les statuts en temps réel. Exemple : EPIC LINUX (commit 23da0e5) — 4 scripts créés, 4 fichiers modifiés, chaque étape suivie.

## Conventions techniques

- Svelte 5 runes (`$state`, `$derived`, `$effect`) — pas de v1 syntax.
- Stores Svelte (`writable`, `derived`, `get`) pour état partagé.
- Modules utilitaires (`.ts`, pas `.svelte.ts`) pour logique infrastructure/DOM.
- Tests : vitest.
- TypeScript strict, pas de `any`.
- Imports absolutisés avec `$lib/`.
