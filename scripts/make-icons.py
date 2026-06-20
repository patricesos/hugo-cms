#!/usr/bin/env python3
"""
scripts/make-icons.py

Génère les icônes PNG du tray launcher Linux directement depuis le SVG.

Usage :
    python3 scripts/make-icons.py

Étapes :
    1. Rend le SVG source (static/favicon.svg) aux 4 tailles (16-32-48-256)
    2. Produit les 3 variantes : normale / active (+cercle vert) / inactive (monochrome)

Dépendances Python :
    - PIL / Pillow (obligatoire, paquet : python3-pil ou pillow)
    - cairosvg   (recommandé, meilleur rendu SVG complexe)
    Si cairosvg n'est pas dispo, on utilise PIL (rendu SVG basique).
"""

from __future__ import annotations

import os
import sys
import shutil
import argparse
from io import BytesIO

from PIL import Image, ImageDraw


# ── Chemins par défaut ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR   = os.path.dirname(SCRIPT_DIR)
DEFAULT_SVG = os.path.join(ROOT_DIR, 'static', 'favicon.svg')
ICON_DIR    = os.path.join(ROOT_DIR, 'dist', 'icon')
DIST_DIR    = os.path.dirname(ICON_DIR)
SIZES       = [16, 32, 48, 256]


# ═══════════════════════════════════════════════════════════════════
# 1. SVG → PNG rasterisation
# ═══════════════════════════════════════════════════════════════════

def svg_to_png_pil(svg_path: str, width: int, height: int) -> Image.Image:
    """Convertit un SVG en PNG via PIL (support basique).

    PIL peut ouvrir les SVG simples. Pour les chemins complexes
    (courbes de Bézier, etc.), le rendu peut être incomplet.
    """
    with open(svg_path, 'rb') as f:
        svg_data = f.read()
    # PIL lit le SVG via SvgImagePlugin avec `scale` pour le resize
    img = Image.open(BytesIO(svg_data))
    # Redimensionner à la taille demandée
    img = img.resize((width, height), Image.LANCZOS)
    # Forcer RGBA pour transparence
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    return img


def svg_to_png_cairosvg(svg_path: str, width: int, height: int) -> Image.Image:
    """Convertit un SVG en PNG via CairoSVG (rendu professionnel).

    Nécessite : pip install cairosvg
    """
    import cairosvg
    png_data = cairosvg.svg2png(
        url=svg_path,
        output_width=width,
        output_height=height,
    )
    img = Image.open(BytesIO(png_data))
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    return img


def render_svg(svg_path: str, width: int, height: int) -> Image.Image:
    """Render un SVG à la taille demandée.

    Détection automatique du meilleur moteur disponible :
      1. cairosvg (si importable)
      2. PIL natif (fallback)
    """
    try:
        import cairosvg
        return svg_to_png_cairosvg(svg_path, width, height)
    except ImportError:
        pass

    # Fallback PIL
    return svg_to_png_pil(svg_path, width, height)


def render_all_sizes(svg_path: str) -> dict[int, Image.Image]:
    """Génère les PNG pour toutes les tailles demandées."""
    images = {}
    for s in SIZES:
        img = render_svg(svg_path, s, s)
        images[s] = img
        print(f'    {s}×{s}  — {img.size}')
    return images


# ═══════════════════════════════════════════════════════════════════
# 2. Variantes d'icônes
# ═══════════════════════════════════════════════════════════════════

def desaturate_rgba(img: Image.Image) -> Image.Image:
    """Convertit une image RGBA en niveaux de gris, conserve l'alpha."""
    r, g, b, a = img.split()
    gray = Image.merge('RGB', (r, g, b)).convert('L')
    return Image.merge('RGBA', (gray, gray, gray, a))


def add_green_dot(img: Image.Image) -> Image.Image:
    """Ajoute un cercle vert (30% de la taille) en bas à droite.

    Même logique que make-ico.py : dot_size = max(4, width * 0.3),
    margin = 2, fill = (34, 197, 94, 255).
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    draw = ImageDraw.Draw(img)
    dot_size = max(4, int(img.width * 0.3))
    margin = 2
    x1 = img.width - dot_size - margin
    y1 = img.height - dot_size - margin
    x2 = x1 + dot_size
    y2 = y1 + dot_size
    draw.ellipse([x1, y1, x2, y2], fill=(34, 197, 94, 255))
    return img


def save_variant(name: str, images: dict[int, Image.Image]) -> str:
    """Sauvegarde les PNG d'une variante :
      - 256×256 → dist/ + icon_dir/
      - 16, 32, 48 → icon_dir/ (sous-tailles pour usage futur)
    """
    stem = os.path.splitext(name)[0]

    # Image principale (256)
    main_path = os.path.join(ICON_DIR, name)
    images[256].save(main_path, format='PNG')
    shutil.copy(main_path, os.path.join(DIST_DIR, name))

    # Sous-tailles
    for s in SIZES:
        sub_path = os.path.join(ICON_DIR, f'{stem}-{s}.png')
        images[s].save(sub_path, format='PNG')

    return main_path


# ═══════════════════════════════════════════════════════════════════
# 3. Main
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description='Génère les icônes PNG depuis le SVG source'
    )
    parser.add_argument(
        '--svg', default=DEFAULT_SVG,
        help=f'Chemin du SVG source (défaut: {DEFAULT_SVG})'
    )
    parser.add_argument(
        '--force-cairosvg', action='store_true',
        help='Échoue si cairosvg n\'est pas dispo (ne pas fallback PIL)'
    )
    args = parser.parse_args()

    svg_path = args.svg
    if not os.path.exists(svg_path):
        print(f'[ERR] SVG introuvable : {svg_path}')
        sys.exit(1)

    if args.force_cairosvg:
        try:
            import cairosvg  # noqa: F401
        except ImportError:
            print('[ERR] cairosvg requis mais non installé.')
            print('  pip install cairosvg')
            sys.exit(1)

    os.makedirs(ICON_DIR, exist_ok=True)

    # ── 1. Render SVG → PNG ──
    print(f'  SVG source : {svg_path}')
    print(f'  Rendu aux tailles : {SIZES}')
    src = render_all_sizes(svg_path)
    print(f'  Rendu terminé ({len(src)} tailles)')

    # ── 2. Variante normale ──
    png_normal = {s: img.copy() for s, img in src.items()}
    path_n = save_variant('hugo-cms.png', png_normal)
    print(f'  Normal:    {path_n}')

    # ── 3. Variante inactive (monochrome) ──
    png_inactive = {}
    for s in SIZES:
        img = src[s].copy()
        png_inactive[s] = desaturate_rgba(img) if img.mode == 'RGBA' else img
    path_i = save_variant('hugo-cms-inactive.png', png_inactive)
    print(f'  Inactive:  {path_i}')

    # ── 4. Variante active (cercle vert) ──
    png_active = {}
    for s in SIZES:
        png_active[s] = add_green_dot(src[s].copy())
    path_a = save_variant('hugo-cms-active.png', png_active)
    print(f'  Active:    {path_a}')


if __name__ == '__main__':
    main()
