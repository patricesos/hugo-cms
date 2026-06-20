#!/usr/bin/env bash
# scripts/install-deps.sh
#
# Détection du gestionnaire de paquets + installation des dépendances
# Linux pour Hugo CMS.
#
# Usage : bash scripts/install-deps.sh
#
# Distributions supportées : Debian/Ubuntu (apt), Fedora (dnf),
# Arch Linux (pacman), openSUSE (zypper).
set -euo pipefail

print_info()  { printf "\033[36m[INFO]\033[0m %s\n" "$1"; }
print_ok()    { printf "\033[32m[OK]\033[0m   %s\n" "$1"; }
print_warn()  { printf "\033[33m[WARN]\033[0m %s\n" "$1"; }
print_err()   { printf "\033[31m[ERR]\033[0m  %s\n" "$1"; }

detect_pkg_manager() {
    if command -v apt &>/dev/null; then
        PKG_MANAGER="apt"
        INSTALL_CMD="sudo apt install -y"
        UPDATE_CMD="sudo apt update"
    elif command -v dnf &>/dev/null; then
        PKG_MANAGER="dnf"
        INSTALL_CMD="sudo dnf install -y"
        UPDATE_CMD="sudo dnf check-update || true"
    elif command -v pacman &>/dev/null; then
        PKG_MANAGER="pacman"
        INSTALL_CMD="sudo pacman -S --noconfirm"
        UPDATE_CMD="sudo pacman -Sy"
    elif command -v zypper &>/dev/null; then
        PKG_MANAGER="zypper"
        INSTALL_CMD="sudo zypper install -y"
        UPDATE_CMD="sudo zypper refresh"
    else
        print_err "Gestionnaire de paquets non reconnu (apt/dnf/pacman/zypper)."
        print_err "Installez manuellement : nodejs, npm, hugo, git, inkscape,"
        print_err "  python3, python3-pip, python3-pil, puis pip install pystray"
        exit 1
    fi
    print_ok "Gestionnaire détecté : ${PKG_MANAGER}"
}

install_packages() {
    print_info "Mise à jour des index..."
    eval "$UPDATE_CMD"

    print_info "Installation des paquets système..."
    case "$PKG_MANAGER" in
        apt)
            $INSTALL_CMD nodejs npm hugo git \
                python3 python3-pip python3-pil python3-cairosvg
            ;;
        dnf)
            # Fedora : python3-pillow au lieu de python3-pil
            $INSTALL_CMD nodejs npm hugo git \
                python3 python3-pip python3-pillow python3-cairosvg
            ;;
        pacman)
            # Arch : python-pillow
            $INSTALL_CMD nodejs npm hugo git \
                python python-pip python-pillow python-cairosvg
            ;;
        zypper)
            $INSTALL_CMD nodejs npm hugo git \
                python3 python3-pip python3-Pillow python3-cairosvg
            ;;
    esac
    print_ok "Paquets système installés"
}

install_python_deps() {
    print_info "Installation des packages Python..."
    pip3 install pystray --quiet --break-system-packages 2>/dev/null \
        || pip3 install pystray --quiet 2>/dev/null \
        || pip3 install pystray --user --quiet
    print_ok "Packages Python installés : pystray, cairosvg (système)"

check_node() {
    if command -v node &>/dev/null; then
        print_ok "Node.js $(node --version)"
    else
        print_warn "node introuvable dans le PATH — vérifiez l'installation"
    fi
}

main() {
    echo ""
    echo "  Hugo CMS — Installation des dépendances Linux"
    echo "  =============================================="
    echo ""

    detect_pkg_manager
    install_packages
    install_python_deps
    check_node

    echo ""
    print_ok "Installation terminée."
    echo ""
    echo "  Pour lancer le CMS directement :"
    echo "    npm install && npm run build && node start.js"
    echo ""
    echo "  Pour la distribution portable :"
    echo "    bash scripts/dist.sh"
    echo "    python3 dist/tray-launcher.py"
    echo ""
}

main
