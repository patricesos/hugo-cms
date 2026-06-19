import os, struct, io
import shutil
from PIL import Image, ImageDraw

icon_dir = os.path.join(os.path.dirname(__file__), '..', 'dist', 'icon')
dist_dir = os.path.dirname(icon_dir)
sizes = [16, 32, 48, 256]

pngs = {}
for s in sizes:
    path = os.path.join(icon_dir, f'icon-{s}.png')
    with open(path, 'rb') as f:
        pngs[s] = f.read()


def build_ico(png_dict, ico_path):
    """Construit un fichier .ico à partir d'un dict {size: png_bytes}."""
    count = len(png_dict)
    header = struct.pack('<HHH', 0, 1, count)
    data_offset = 6 + count * 16
    entries = b''
    data = b''
    for s in sizes:
        png = png_dict[s]
        w = 0 if s == 256 else s
        h = 0 if s == 256 else s
        bpp = 32
        entry = struct.pack('<BBBBHHII', w, h, 0, 0, 1, bpp, len(png), data_offset)
        entries += entry
        data += png
        data_offset += len(png)
    with open(ico_path, 'wb') as f:
        f.write(header + entries + data)


def save_ico(name, png_dict):
    """Build .ico in icon_dir and copy to dist_dir, return path."""
    ico_path = os.path.join(icon_dir, name)
    build_ico(png_dict, ico_path)
    shutil.copy(ico_path, os.path.join(dist_dir, name))
    return ico_path


def desaturate_rgba(img):
    """Convert RGBA image to grayscale keeping alpha."""
    r, g, b, a = img.split()
    gray = Image.merge('RGB', (r, g, b)).convert('L')
    return Image.merge('RGBA', (gray, gray, gray, a))


def add_green_dot(img):
    """Draw a small green dot (30% size) bottom-right."""
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


def pngs_from_images(images):
    """Convert {size: PIL Image} to {size: PNG bytes}."""
    result = {}
    for s, img in images.items():
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        result[s] = buf.getvalue()
    return result


# --- 1. ICO normal ---
ico_normal = save_ico('hugo-cms.ico', pngs)

# --- 2. ICO inactif (monochrome) ---
images_inactive = {}
for s in sizes:
    img = Image.open(io.BytesIO(pngs[s]))
    images_inactive[s] = desaturate_rgba(img) if img.mode == 'RGBA' else img
pngs_inactive = pngs_from_images(images_inactive)
ico_inactive = save_ico('hugo-cms-inactive.ico', pngs_inactive)

# --- 3. ICO actif (normal + cercle vert) ---
images_active = {}
for s in sizes:
    img = Image.open(io.BytesIO(pngs[s]))
    images_active[s] = add_green_dot(img)
pngs_active = pngs_from_images(images_active)
ico_active = save_ico('hugo-cms-active.ico', pngs_active)

print(f'ICO normal:   {ico_normal}   ({os.path.getsize(ico_normal)} bytes)')
print(f'ICO actif:    {ico_active}   ({os.path.getsize(ico_active)} bytes)')
print(f'ICO inactif:  {ico_inactive}   ({os.path.getsize(ico_inactive)} bytes)')
print(f'Sizes: {sizes}')
