import os
import struct

icon_dir = os.path.join(os.path.dirname(__file__), '..', 'dist', 'icon')
sizes = [16, 32, 48, 256]

pngs = {}
for s in sizes:
    path = os.path.join(icon_dir, f'icon-{s}.png')
    with open(path, 'rb') as f:
        pngs[s] = f.read()

ico_path = os.path.join(icon_dir, 'hugo-cms.ico')

count = len(sizes)
header = struct.pack('<HHH', 0, 1, count)

data_offset = 6 + count * 16
entries = b''
data = b''

for s in sizes:
    png = pngs[s]
    w = 0 if s == 256 else s
    h = 0 if s == 256 else s
    bpp = 32
    entry = struct.pack('<BBBBHHII', w, h, 0, 0, 1, bpp, len(png), data_offset)
    entries += entry
    data += png
    data_offset += len(png)

with open(ico_path, 'wb') as f:
    f.write(header + entries + data)

# also copy to dist/ for tray launcher
import shutil
shutil.copy(ico_path, os.path.join(os.path.dirname(icon_dir), 'hugo-cms.ico'))

print(f'ICO created: {ico_path}')
print(f'Sizes: {sizes}')
print(f'Total: {os.path.getsize(ico_path)} bytes')
