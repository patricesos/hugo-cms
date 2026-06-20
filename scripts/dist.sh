#!/usr/bin/env bash
# scripts/dist.sh
#
# Script de distribution Linux pour Hugo CMS.
# Équivalent fonctionnel de dist.ps1 (Windows).
#
# Étapes :
#   1. Build SvelteKit (npm run build)
#   2. Génération des icônes PNG (Inkscape + make-icons.py)
#   3. Bundle esbuild du serveur → dist/bundle.mjs
#   4. Copie des assets client
#   5. Copie des fichiers auxiliaires (.env.example, tray-launcher.py, start.sh)
#   6. Génération du fichier .desktop (entrée de menu Freedesktop)
#
# Usage : bash scripts/dist.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT/dist"
ICON_DIR="$DIST_DIR/icon"

print_header() { printf "\n\033[35m=== %s ===\033[0m\n" "$1"; }
print_info()   { printf "  \033[36m%s\033[0m\n" "$1"; }
print_ok()     { printf "  \033[32m✓ %s\033[0m\n" "$1"; }

# ── Nettoyage du dossier dist ──
# WSL : rm -rf peut échouer sur des fichiers créés par Windows (ex: .exe).
# On supprime d'abord les gros blocs, puis on force la création.
for item in "$DIST_DIR"/*; do
    [ -e "$item" ] || break
    rm -rf "$item" 2>/dev/null || true
done
mkdir -p "$DIST_DIR" "$ICON_DIR"

# ── 1. Build SvelteKit ──
print_header "1. Build SvelteKit"
cd "$ROOT"
npm run build
print_ok "SvelteKit build terminé"

# ── 2. Générer icônes PNG (SVG → PNG via Python PIL/cairosvg) ──
print_header "2. Générer icônes PNG"
print_info "SVG → PNG via Python..."
python3 "$ROOT/scripts/make-icons.py"
print_ok "Icônes générées dans $ICON_DIR"

# ── 3. Bundle server avec esbuild ──
print_header "3. Bundle serveur (esbuild)"
npx esbuild build/index.js --bundle --platform=node --format=esm \
    --outfile="$DIST_DIR/bundle.mjs" \
    --external:stream --external:fs --external:path --external:os \
    --external:crypto --external:child_process --external:module \
    --external:url --external:util --external:assert --external:events \
    --external:tty \
    --banner:js="import { createRequire } from 'module'; var require = createRequire(import.meta.url);"
print_ok "Bundle créé : $(du -h "$DIST_DIR/bundle.mjs" | cut -f1)"

# ── 4. Copier client/ ──
print_header "4. Copier assets client"
if [ -d "$ROOT/build/client" ]; then
    cp -r "$ROOT/build/client" "$DIST_DIR/client"
    print_ok "Client copié ($(du -sh "$DIST_DIR/client" | cut -f1))"
else
    print_warn "build/client/ introuvable — skip"
fi

# ── 5. Copier fichiers auxiliaires ──
print_header "5. Fichiers auxiliaires"
cp "$ROOT/.env.example" "$DIST_DIR/.env.example"
cp "$ROOT/scripts/tray-launcher.py" "$DIST_DIR/tray-launcher.py"
cp "$ROOT/start.sh" "$DIST_DIR/start.sh"
chmod +x "$DIST_DIR/start.sh" "$DIST_DIR/tray-launcher.py"
print_ok ".env.example, tray-launcher.py, start.sh"

# ── 6. Générer .desktop file ──
print_header "6. Entrée de menu (.desktop)"
ABS_DIST_DIR="$(cd "$DIST_DIR" && pwd)"
cat > "$DIST_DIR/hugo-cms.desktop" << EOF
[Desktop Entry]
Version=1.0
Name=Hugo CMS
Comment=Interface d'administration pour sites Hugo
Type=Application
Exec=${ABS_DIST_DIR}/start.sh
Icon=${ABS_DIST_DIR}/hugo-cms.png
Terminal=false
Categories=Development;WebDevelopment;
StartupNotify=false
EOF
print_ok "hugo-cms.desktop créé"

# ── Résumé ──
print_header "Distribution prête"
echo ""
echo "  Dossier : ${DIST_DIR}"
echo ""
ls -lh "$DIST_DIR" | awk 'NR>1 {print "  " $NF "  (" $5 ")"}'
echo ""

# Taille totale
TOTAL_SIZE=$(du -sh "$DIST_DIR" | cut -f1)
echo "  Taille totale : ~${TOTAL_SIZE} (plus Node.js runtime)"
echo ""
print_info "Lancement rapide :"
print_info "  cd ${DIST_DIR} && ./start.sh"
print_info "  # ou avec icône systray :"
print_info "  python3 ${DIST_DIR}/tray-launcher.py"
echo ""
