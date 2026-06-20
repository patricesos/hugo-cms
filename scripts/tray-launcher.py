#!/usr/bin/env python3
"""
scripts/tray-launcher.py

Lanceur systray Linux pour Hugo CMS.
Équivalent de tray-launcher.cs (C#, WinForms, user32.dll).

Dépendances :
  - pystray (pip install pystray)
  - Pillow / PIL (fourni par python3-pil / python3-pillow)

Usage : python3 tray-launcher.py

Fonctionnalités (miroir de la version C#) :
  - Icône systray avec 3 états : normal (démarrage), active (running), inactive (arrêté/erreur)
  - Menu : Ouvrir dans le navigateur, Console (logs), Démarrer/Arrêter, Redémarrer, Quitter
  - Démarre le bundle Node (bundle.mjs) en enfant
  - Détection de "Listening on" dans stdout → icône Running
  - Notification système (notify-send) en cas de crash inattendu
  - Lecture du port depuis env, config.toml, ou 1703 par défaut
"""

from __future__ import annotations

import os
import re
import sys
import signal
import subprocess
import threading
import webbrowser
from datetime import datetime
from pathlib import Path
from shutil import which as shutil_which

from PIL import Image

try:
    import pystray
    from pystray import MenuItem as Item
except ImportError:
    print("Erreur : pystray n'est pas installé.")
    print("  pip install pystray")
    sys.exit(1)


# ── Chemins ──
APP_DIR = Path(__file__).parent.resolve()

ICON_NORMAL   = str(APP_DIR / 'hugo-cms.png')
ICON_ACTIVE   = str(APP_DIR / 'hugo-cms-active.png')
ICON_INACTIVE = str(APP_DIR / 'hugo-cms-inactive.png')

DEFAULT_PORT = 1703


# ═══════════════════════════════════════════════════════════════════
# TrayLauncher
# ═══════════════════════════════════════════════════════════════════

class TrayLauncher:
    """Gère l'icône systray et le cycle de vie du serveur Node.

    Même logique que la classe C# TrayLauncher (tray-launcher.cs),
    adaptée à pystray + Pillow.
    """

    def __init__(self) -> None:
        self._node_path = self._find_node()
        self._server_process: subprocess.Popen | None = None
        self._listening_found = False
        self._is_stopping = False

        # Charger les icônes PNG (forcées à 64×64 pour le systray)
        self._img_normal   = self._load_icon(ICON_NORMAL)
        self._img_active   = self._load_icon(ICON_ACTIVE)
        self._img_inactive = self._load_icon(ICON_INACTIVE)

        # Menu initial (mis à jour dynamiquement après)
        self._icon = pystray.Icon(
            'hugo-cms',
            icon=self._img_inactive,
            menu=self._build_menu(running=False),
            title='Hugo CMS — Arrêté',
        )

    # ── Ressources ──

    @staticmethod
    def _load_icon(path: str) -> Image.Image:
        """Charge une icône PNG et la redimensionne pour le systray."""
        img = Image.open(path)
        img = img.resize((64, 64), Image.LANCZOS)
        return img

    @staticmethod
    def _find_node() -> str:
        """Recherche le binaire node dans PATH ou dans le dossier de l'app."""
        # Portable : node à côté du bundle
        local_node = APP_DIR / 'node'
        if local_node.exists():
            return str(local_node)

        # Via le PATH système (shutil.which)
        found = shutil_which('node')
        if found:
            return found

        # Fallback — on laisse subprocess lever l'erreur
        return 'node'

    def _get_port(self) -> str:
        """Lit le port depuis l'env, config.toml, ou la valeur par défaut."""
        port = os.environ.get('PORT')
        if port:
            return port

        cfg_path = Path.home() / '.config' / 'hugocms' / 'config.toml'
        if cfg_path.exists():
            try:
                text = cfg_path.read_text()
                match = re.search(
                    r'^cmsPort\s*=\s*(\d[_\d]*\d|\d)\s*$',
                    text,
                    re.MULTILINE,
                )
                if match:
                    return match.group(1).replace('_', '')
            except OSError:
                pass

        return str(DEFAULT_PORT)

    # ── Menu dynamique ──

    def _build_menu(self, running: bool) -> pystray.Menu:
        """Construit le menu contextuel (actualisé à chaque changement d'état)."""
        label_toggle = 'Arrêter le serveur' if running else 'Démarrer le serveur'
        return pystray.Menu(
            Item('Ouvrir dans le navigateur', self._on_open, default=True),
            Item('Console (logs)', self._on_console),
            Item(label_toggle, self._on_toggle_server),
            Item('Redémarrer', self._on_restart, enabled=running),
            Item('Quitter', self._on_quit),
        )

    def _refresh(self, state: str) -> None:
        """Met à jour l'icône, le tooltip et le menu en fonction de l'état."""
        if state == 'running':
            self._icon.icon = self._img_active
            self._icon.title = 'Hugo CMS — Actif'
        elif state == 'starting':
            self._icon.icon = self._img_normal
            self._icon.title = 'Hugo CMS — Démarrage…'
        elif state == 'error':
            self._icon.icon = self._img_inactive
            self._icon.title = 'Hugo CMS — Erreur'
        else:
            self._icon.icon = self._img_inactive
            self._icon.title = 'Hugo CMS — Arrêté'

        running = state in ('running', 'starting')
        self._icon.menu = self._build_menu(running)

    # ── Handlers du menu ──

    def _on_open(self, _icon: pystray.Icon, _item: pystray.MenuItem) -> None:
        port = self._get_port()
        webbrowser.open(f'http://localhost:{port}')

    def _on_console(self, _icon: pystray.Icon, _item: pystray.MenuItem) -> None:
        """Ouvre le fichier de log dans le navigateur/éditeur par défaut."""
        log_path = APP_DIR / 'hugo-cms.log'
        if log_path.exists():
            webbrowser.open(str(log_path))

    def _on_toggle_server(self, _icon: pystray.Icon, _item: pystray.MenuItem) -> None:
        if self._server_process is not None and self._server_process.poll() is None:
            self._stop_server()
        else:
            self._start_server()

    def _on_restart(self, _icon: pystray.Icon, _item: pystray.MenuItem) -> None:
        self._is_stopping = True
        self._stop_server()
        self._is_stopping = False
        self._start_server()

    def _on_quit(self, _icon: pystray.Icon, _item: pystray.MenuItem) -> None:
        self._is_stopping = True
        self._stop_server()
        self._icon.stop()

    # ── Gestion du processus serveur ──

    def _find_script(self) -> str | None:
        """Cherche bundle.mjs ou build/index.js dans le dossier de l'app."""
        bundle = APP_DIR / 'bundle.mjs'
        if bundle.exists():
            return str(bundle)
        index = APP_DIR / 'build' / 'index.js'
        if index.exists():
            return str(index)
        return None

    def _start_server(self) -> None:
        if self._server_process is not None and self._server_process.poll() is None:
            return

        script_path = self._find_script()
        if script_path is None:
            self._notify(
                'Hugo CMS',
                'Aucun bundle trouvé (bundle.mjs ou build/index.js).\n'
                'Exécutez d\'abord : bash scripts/dist.sh',
            )
            return

        port = self._get_port()
        self._listening_found = False
        self._is_stopping = False

        env = os.environ.copy()
        env['PORT'] = port
        env['NODE_ENV'] = 'production'

        try:
            self._server_process = subprocess.Popen(
                [self._node_path, script_path],
                cwd=str(APP_DIR),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
        except FileNotFoundError:
            self._notify(
                'Hugo CMS',
                f'Node introuvable : {self._node_path}.\n'
                'Vérifiez votre installation Node.js.',
            )
            self._refresh('error')
            return

        self._refresh('starting')

        # Threads de lecture stdout/stderr
        threading.Thread(
            target=self._read_stream,
            args=(self._server_process.stdout, False),
            daemon=True,
        ).start()
        threading.Thread(
            target=self._read_stream,
            args=(self._server_process.stderr, True),
            daemon=True,
        ).start()

        # Thread de surveillance de la terminaison du processus
        threading.Thread(target=self._wait_process, daemon=True).start()

    def _read_stream(self, stream, is_err: bool) -> None:
        """Lit ligne par ligne un pipe stdout/stderr.

        Détecte le message 'Listening on' pour passer l'icône en Running.
        Écrit les lignes dans le fichier hugo-cms.log.
        """
        if stream is None:
            return

        prefix = '[ERR]' if is_err else ''
        log_path = APP_DIR / 'hugo-cms.log'

        with open(log_path, 'a', buffering=1) as log:
            for line in stream:
                line = line.rstrip('\n')
                if not line:
                    continue

                timestamp = datetime.now().strftime('%H:%M:%S')
                log_entry = f'[{timestamp}] {prefix} {line}'
                log.write(log_entry + '\n')

                # Détection du signal 'Listening on' (SvelteKit adapter-node)
                if not self._listening_found and re.search(
                    r'Listening on https?://', line
                ):
                    self._listening_found = True
                    self._refresh('running')

    def _wait_process(self) -> None:
        """Attend la fin du processus enfant et met à jour l'état.

        Comme dans le C#, on distingue arrêt volontaire et crash
        via le flag _is_stopping.
        """
        if self._server_process is None:
            return

        try:
            self._server_process.wait()
        except (OSError, AttributeError):
            return

        if self._is_stopping:
            self._refresh('stopped')
        else:
            self._notify(
                'Hugo CMS — Serveur arrêté',
                'Le serveur s\'est arrêté de façon inattendue.\n'
                'Cliquez sur "Démarrer le serveur" pour le relancer.',
            )
            self._refresh('error')

        self._server_process = None

    def _stop_server(self) -> None:
        """Arrête le processus Node.

        Envoie SIGTERM, puis SIGKILL après 3s si le processus ne répond pas.
        """
        if self._server_process is None:
            return

        try:
            if self._server_process.poll() is None:
                self._server_process.terminate()
                try:
                    self._server_process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    self._server_process.kill()
                    self._server_process.wait(timeout=2)
        except (OSError, AttributeError, subprocess.TimeoutExpired):
            pass

        self._server_process = None

    # ── Notification système ──

    @staticmethod
    def _notify(title: str, message: str) -> None:
        """Notification D-Bus via notify-send.

        Silencieux si notify-send n'est pas disponible (docker, minimal).
        """
        try:
            subprocess.run(
                ['notify-send', '--app-name=Hugo CMS', title, message],
                capture_output=True,
                timeout=5,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

    # ── Boucle principale ──

    def run(self) -> None:
        """Démarre le serveur et lance la boucle du tray icon."""
        self._start_server()
        self._icon.run()

    def stop(self) -> None:
        """Nettoyage en cas de signal d'arrêt."""
        self._on_quit(self._icon, None)


# ═══════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════

def main() -> None:
    # Vérifier la présence des icônes
    missing = [p for p in (ICON_NORMAL, ICON_ACTIVE, ICON_INACTIVE) if not os.path.exists(p)]
    if missing:
        print('Icônes manquantes. Exécutez d\'abord : bash scripts/dist.sh')
        print('\n'.join(f'  - {m}' for m in missing))

    launcher = TrayLauncher()

    # Intercepter SIGINT/SIGTERM pour un arrêt propre
    def _signal_handler(_signum, _frame) -> None:
        launcher.stop()

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    launcher.run()


if __name__ == '__main__':
    main()
