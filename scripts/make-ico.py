import os
from PIL import Image

icon_dir = os.path.join(os.path.dirname(__file__), '..', 'dist', 'icon')
sizes = [16, 32, 48, 256]
imgs = []
for s in sizes:
    path = os.path.join(icon_dir, f'icon-{s}.png')
    imgs.append(Image.open(path))

ico_path = os.path.join(icon_dir, 'hugo-cms.ico')
imgs[0].save(ico_path, format='ICO', sizes=[(s, s) for s in sizes], append_images=imgs[1:])
print(f'ICO created: {ico_path}')
print(f'Size: {os.path.getsize(ico_path)} bytes')
