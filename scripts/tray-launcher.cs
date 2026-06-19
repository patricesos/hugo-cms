using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Windows.Forms;

/// <summary>
/// Fenêtre de console affichant stdout/stderr du processus Node.
/// Utilise BeginInvoke pour les mises à jour thread-safe depuis les callbacks asynchrones.
/// </summary>
class LogWindow : Form
{
    private TextBox textBox;

    public LogWindow()
    {
        Text = "Hugo CMS — Console";
        Size = new Size(800, 400);
        StartPosition = FormStartPosition.Manual;
        Location = new Point(100, 100);

        textBox = new TextBox();
        textBox.Multiline = true;
        textBox.ReadOnly = true;
        textBox.ScrollBars = ScrollBars.Vertical;
        textBox.WordWrap = true;
        textBox.Dock = DockStyle.Fill;
        textBox.Font = new Font("Consolas", 9.75f);
        textBox.BackColor = Color.FromArgb(30, 30, 30);
        textBox.ForeColor = Color.FromArgb(220, 220, 220);

        Controls.Add(textBox);
    }

    public void Append(string text)
    {
        if (textBox.IsDisposed) return;

        if (textBox.InvokeRequired)
        {
            textBox.BeginInvoke(new Action<string>(Append), text);
            return;
        }

        textBox.AppendText(text);
        textBox.SelectionStart = textBox.Text.Length;
        textBox.ScrollToCaret();
    }
}

class TrayLauncher : Form
{
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    private static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    // Nécessaire pour DestroyIcon : éviter la fuite de handles GDI natifs créés
    // par Icon.FromHandle() — le GC .NET ne libère pas ces handles natifs.
    [DllImport("user32.dll")]
    private static extern bool DestroyIcon(IntPtr hIcon);

    private const int SW_HIDE = 0;
    private const int SW_SHOW = 5;

    // États possibles du serveur Node, reflétés dans l'icône du tray.
    private enum ServerState { Stopped, Starting, Running, Error }

    private NotifyIcon trayIcon;
    private Process serverProcess;
    private ContextMenuStrip trayMenu;
    private ToolStripMenuItem consoleMenuItem;
    private ToolStripMenuItem openMenuItem;       // "Ouvrir dans le navigateur"
    private ToolStripMenuItem stopMenuItem;       // "Démarrer / Arrêter le serveur"
    private ToolStripMenuItem restartMenuItem;    // "Redémarrer"
    private LogWindow logWindow;
    private string appDir;
    private string nodePath;
    private bool consoleVisible = false;

    // --- US-120 : État ---
    private Icon _baseIcon;                // icône originale depuis le fichier .ico
    private ServerState _currentState = ServerState.Stopped;
    private bool _listeningOnFound = false; // true quand "Listening on" est repéré dans stdout

    // --- US-121 : Distinction crash volontaire vs inattendu ---
    private bool _isStoppingIntentionally = false;

    [STAThread]
    static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new TrayLauncher());
    }

    public TrayLauncher()
    {
        appDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        nodePath = FindNode();
        _baseIcon = LoadIcon(); // icône de base cachée une fois pour toutes (US-120)

        logWindow = new LogWindow();
        logWindow.FormClosing += (s, e) =>
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                logWindow.Hide();
                consoleVisible = false;
                consoleMenuItem.Checked = false;
            }
        };

        // --- Menu contextuel enrichi (US-120, US-122) ---
        trayMenu = new ContextMenuStrip();

        openMenuItem = new ToolStripMenuItem("Ouvrir dans le navigateur", null, OnOpen);
        trayMenu.Items.Add(openMenuItem);

        trayMenu.Items.Add("-");

        consoleMenuItem = new ToolStripMenuItem("Console", null, OnConsole);
        consoleMenuItem.Checked = false;
        trayMenu.Items.Add(consoleMenuItem);

        trayMenu.Items.Add("-");

        stopMenuItem = new ToolStripMenuItem("Arrêter le serveur", null, OnStop);
        trayMenu.Items.Add(stopMenuItem);

        restartMenuItem = new ToolStripMenuItem("Redémarrer", null, OnRestart);
        trayMenu.Items.Add(restartMenuItem);

        trayMenu.Items.Add("-");
        trayMenu.Items.Add("Quitter", null, OnQuit);

        // --- Tray icon ---
        trayIcon = new NotifyIcon();
        trayIcon.Text = "Hugo CMS — Arrêté";
        trayIcon.Icon = _baseIcon;
        trayIcon.ContextMenuStrip = trayMenu;
        trayIcon.Visible = true;
        trayIcon.DoubleClick += OnOpen;

        // Synchroniser l'état du menu avec l'état initial
        UpdateMenuState();

        StartServer();
    }

    /// <summary>Charge l'icône .ico depuis le dossier de l'exe.</summary>
    private Icon LoadIcon()
    {
        string icoPath = Path.Combine(appDir, "hugo-cms.ico");
        if (File.Exists(icoPath))
            return new Icon(icoPath);
        return SystemIcons.Application;
    }

    /// <summary>
    /// Cherche node.exe dans le PATH, Program Files, ou le dossier local.
    /// </summary>
    private string FindNode()
    {
        string localNode = Path.Combine(appDir, "node.exe");
        if (File.Exists(localNode))
            return localNode;

        string pathEnv = Environment.GetEnvironmentVariable("PATH");
        if (pathEnv != null)
        {
            string[] dirs = pathEnv.Split(new char[] { Path.PathSeparator }, StringSplitOptions.RemoveEmptyEntries);
            foreach (string dir in dirs)
            {
                try
                {
                    string candidate = Path.Combine(dir, "node.exe");
                    if (File.Exists(candidate))
                        return candidate;
                }
                catch { }
            }
        }

        string programFiles = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            "nodejs", "node.exe");
        if (File.Exists(programFiles))
            return programFiles;

        string programFilesX86 = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            "nodejs", "node.exe");
        if (File.Exists(programFilesX86))
            return programFilesX86;

        return "node.exe";
    }

    // =========================================================================
    // US-120 : Génération d'icône avec badge de couleur
    // =========================================================================

    /// <summary>
    /// Superpose un badge de couleur (cercle) en bas à droite de l'icône de base.
    /// Gris = arrêté, Orange = démarrage, Vert = actif, Rouge = erreur.
    /// Les couleurs sont cohérentes avec les tokens --c-* de l'app web.
    /// </summary>
    private Icon BuildIconForState(Icon baseIcon, ServerState state)
    {
        if (state == ServerState.Stopped)
            return baseIcon;

        // Choix de la couleur du badge selon l'état. C# 5 ne supporte pas
        // les switch expressions, on utilise un switch classique.
        Color badgeColor;
        switch (state)
        {
            case ServerState.Running:  badgeColor = Color.FromArgb(34, 197, 94); break;   // vert  -> --c-success
            case ServerState.Starting: badgeColor = Color.FromArgb(245, 158, 11); break; // orange -> --c-warning
            case ServerState.Error:    badgeColor = Color.FromArgb(239, 68, 68); break;   // rouge  -> --c-danger
            default:                   badgeColor = Color.Transparent; break;
        }

        // Créer un bitmap 32bpp ARGB pour garantir la compatibilité GDI+.
        // Icon.ToBitmap() peut échouer sur certains formats .ico compressés.
        using (Bitmap bmp = new Bitmap(baseIcon.Width, baseIcon.Height,
            System.Drawing.Imaging.PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bmp))
        {
            // Dessiner l'icône de base sur le bitmap
            g.DrawIcon(baseIcon, 0, 0);

            // Badge en bas à droite, taille 50% de l'icône pour être
            // visible même à 16×16 dans la barre des tâches.
            int badgeSize = Math.Max(7, (int)Math.Round(bmp.Width * 0.5));
            int margin = 1;
            Rectangle badgeRect = new Rectangle(
                bmp.Width - badgeSize - margin,
                bmp.Height - badgeSize - margin,
                badgeSize, badgeSize);

            // Cercle blanc externe pour le contraste sur le fond rose du logo
            using (Pen whitePen = new Pen(Color.White, 1.5f))
            {
                g.DrawEllipse(whitePen, badgeRect);
            }

            using (Brush brush = new SolidBrush(badgeColor))
            {
                g.FillEllipse(brush,
                    badgeRect.X + 2, badgeRect.Y + 2,
                    badgeRect.Width - 4, badgeRect.Height - 4);
            }

            // Icon.FromHandle crée un handle GDI natif qui n'est PAS géré par
            // le GC .NET — il faut appeler DestroyIcon explicitement (cf.
            // DestroyIconSafe et UpdateTrayIcon).
            return Icon.FromHandle(bmp.GetHicon());
        }
    }

    /// <summary>
    /// Met à jour l'icône du tray, le texte du tooltip, et l'état du menu.
    /// Appelée à chaque changement d'état du serveur.
    ///
    /// ATTENTION — fuite de handles GDI : à chaque changement d'état,
    /// l'ancienne icône (celle créée par BuildIconForState -> Icon.FromHandle)
    /// doit être détruite via DestroyIcon. L'icône de base (_baseIcon) ne doit
    /// JAMAIS être détruite ici — elle est possédée par le constructeur et sera
    /// libérée dans Dispose().
    /// </summary>
    private void UpdateTrayIcon(ServerState newState)
    {
        _currentState = newState;
        _listeningOnFound = false;

        Icon oldIcon = trayIcon.Icon;

        // Construire la nouvelle icône avec le badge approprié
        trayIcon.Icon = BuildIconForState(_baseIcon, newState);

        // Mettre à jour le tooltip avec le libellé d'état
        trayIcon.Text = string.Format("Hugo CMS — {0}", StateLabel(newState));

        // Détruire l'ancienne icône si ce n'est pas l'icône de base
        // (l'icône de base persistée dans _baseIcon ne doit pas être libérée ici)
        if (oldIcon != null && oldIcon != _baseIcon)
        {
            DestroyIconSafe(oldIcon);
        }

        UpdateMenuState();
    }

    /// <summary>Libellé court pour le tooltip du tray.</summary>
    private string StateLabel(ServerState state)
    {
        switch (state)
        {
            case ServerState.Running:  return "Actif";
            case ServerState.Starting: return "Démarrage…";
            case ServerState.Error:    return "Erreur";
            default:                   return "Arrêté";
        }
    }

    /// <summary>
    /// Détruit proprement un handle GDI natif créé par Icon.FromHandle.
    /// Icon.Dispose() ne libère PAS le handle natif — c'est un wrapper managé
    /// qui ne prend pas possession du handle. Sans cet appel, chaque changement
    /// d'icône laisse fuir un handle, ce qui dégrade les performances système
    /// sur une session longue.
    /// </summary>
    private void DestroyIconSafe(Icon icon)
    {
        if (icon == null) return;
        try
        {
            DestroyIcon(icon.Handle);
        }
        catch
        {
            // Ignorer — un double DestroyIcon sur un handle déjà libéré
            // est un no-op côté user32.
        }
    }

    /// <summary>
    /// Active/désactive les items de menu selon l'état du serveur.
    /// Le bouton stopMenuItem bascule entre "Démarrer" et "Arrêter".
    /// </summary>
    /// <summary>
    /// Met à jour l'état du menu en fonction de l'état du processus.
    /// Protégé contre InvalidOperationException : HasExited échoue si le
    /// Process a été créé (new Process()) mais pas encore démarré (Start()).
    /// </summary>
    private void UpdateMenuState()
    {
        bool running = false;
        if (serverProcess != null)
        {
            try
            {
                running = !serverProcess.HasExited;
            }
            catch (InvalidOperationException)
            {
                // Process créé mais pas encore démarré -> pas running
                running = false;
            }
        }
        openMenuItem.Enabled = running;
        restartMenuItem.Enabled = running;
        stopMenuItem.Text = running ? "Arrêter le serveur" : "Démarrer le serveur";
    }

    // =========================================================================
    // Gestion du processus serveur Node
    // =========================================================================

    /// <summary>
    /// Démarre le processus Node (bundle.mjs ou build/index.js).
    /// Passe l'icône en orange (Starting), puis dès que le message "Listening on"
    /// est détecté dans stdout, passe en vert (Running).
    ///
    /// Note : serverProcess.Kill() (dans StopServer) cible uniquement le PID
    /// de ce Process.Start() — jamais un taskkill /IM node.exe. Aucun risque
    /// pour d'autres processus Node sur la machine.
    /// </summary>
    private void StartServer()
    {
        if (serverProcess != null && !serverProcess.HasExited)
            return;

        string bundlePath = Path.Combine(appDir, "bundle.mjs");
        string indexPath = Path.Combine(appDir, "build", "index.js");

        string scriptPath;
        if (File.Exists(bundlePath))
            scriptPath = bundlePath;
        else if (File.Exists(indexPath))
            scriptPath = indexPath;
        else
            return;

        // Forcer la création du handle logWindow pour que InvokeRequired
        // fonctionne depuis n'importe quel thread
        IntPtr tmp = logWindow.Handle;

        ProcessStartInfo psi = new ProcessStartInfo();
        psi.FileName = nodePath;
        psi.Arguments = string.Format("\"{0}\"", scriptPath);
        psi.WorkingDirectory = appDir;
        psi.UseShellExecute = false;
        psi.CreateNoWindow = true;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.EnvironmentVariables["PORT"] = GetCmsPort();

        try
        {
            serverProcess = new Process();
            serverProcess.StartInfo = psi;
            serverProcess.EnableRaisingEvents = true;

            // US-120 : détection du démarrage réussi
            // SvelteKit/adapter-node imprime "Listening on http://..." une fois
            // le serveur HTTP prêt. Dès qu'on voit ce pattern, on passe au vert.
            _listeningOnFound = false;

            serverProcess.OutputDataReceived += (s, e) =>
            {
                if (e.Data == null) return;

                logWindow.Append(string.Format("[{0}] {1}{2}",
                    DateTime.Now.ToString("HH:mm:ss"), e.Data, Environment.NewLine));

                if (!_listeningOnFound && Regex.IsMatch(e.Data, @"Listening on https?://"))
                {
                    _listeningOnFound = true;
                    // Marshaling vers le thread UI car ce handler tourne sur
                    // un thread pool thread
                    BeginInvoke(new Action(() => UpdateTrayIcon(ServerState.Running)));
                }
            };

            serverProcess.ErrorDataReceived += (s, e) =>
            {
                if (e.Data != null)
                    logWindow.Append(string.Format("[{0}] ERR {1}{2}",
                        DateTime.Now.ToString("HH:mm:ss"), e.Data, Environment.NewLine));
            };

            // US-120 : arrêt inattendu -> rouge
            // US-121 : notification système
            serverProcess.Exited += (s, e) =>
            {
                // Protection contre un Exited tardif : si le processus qui a
                // émis l'event n'est plus celui référencé, c'est un vestige
                // d'un ancien processus tué par StopServer().
                Process exited = s as Process;
                if (exited != null && exited != serverProcess)
                    return;

                logWindow.Append(string.Format("[{0}] Server stopped.{1}",
                    DateTime.Now.ToString("HH:mm:ss"), Environment.NewLine));

                if (_isStoppingIntentionally)
                {
                    // Arrêt volontaire (clic "Arrêter", "Redémarrer" ou
                    // "Quitter") — pas de notification, icône passe au gris
                    BeginInvoke(new Action(() => {
                        UpdateTrayIcon(ServerState.Stopped);
                        _isStoppingIntentionally = false;
                    }));
                }
                else
                {
                    // Crash ou arrêt inattendu — notification + icône rouge
                    BeginInvoke(new Action(() => {
                        trayIcon.ShowBalloonTip(
                            5000,
                            "Hugo CMS — Serveur arrêté",
                            "Le serveur s'est arrêté de façon inattendue. "
                            + "Cliquez sur \"Démarrer le serveur\" dans le menu pour le relancer.",
                            ToolTipIcon.Warning
                        );
                        UpdateTrayIcon(ServerState.Error);
                    }));
                }

                serverProcess = null;
            };

            // Icône orange -> le processus est en train de démarrer
            UpdateTrayIcon(ServerState.Starting);

            serverProcess.Start();
            serverProcess.BeginOutputReadLine();
            serverProcess.BeginErrorReadLine();

            // Icône orange -> le processus est en train de démarrer.
            // À faire APRÈS Start() car UpdateMenuState lit HasExited,
            // qui lance InvalidOperationException si le process n'a pas
            // encore été démarré.
            UpdateTrayIcon(ServerState.Starting);

            consoleVisible = false;
            consoleMenuItem.Checked = false;
        }
        catch (Exception)
        {
            serverProcess = null;
            UpdateTrayIcon(ServerState.Error);
        }
    }

    /// <summary>
    /// Arrête le processus serveur Node.
    /// serverProcess.Kill() cible exclusivement le PID de ce process enfant
    /// — pas d'effet de bord sur d'autres processus Node sur la machine.
    /// Le flag _isStoppingIntentionally est positionné avant Kill() pour que
    /// le callback Exited ne déclenche PAS de fausse notification de crash.
    /// </summary>
    private void StopServer()
    {
        if (serverProcess == null)
            return;

        try
        {
            if (serverProcess.HasExited)
                return;
        }
        catch (InvalidOperationException)
        {
            // Process créé mais pas démarré — rien à arrêter
            serverProcess = null;
            return;
        }

        try
        {
            logWindow.Append(string.Format("[{0}] Stopping server...{1}",
                DateTime.Now.ToString("HH:mm:ss"), Environment.NewLine));
            serverProcess.Kill();
            serverProcess.WaitForExit(2000);
        }
        catch { }

        // Ne pas appeler UpdateTrayIcon ici — le callback Exited s'en charge
        // (il a été appelé pendant WaitForExit).
        serverProcess = null;
    }

    private void ToggleConsole()
    {
        consoleVisible = !consoleVisible;

        if (consoleVisible)
        {
            logWindow.Show();
            logWindow.Activate();
        }
        else
        {
            logWindow.Hide();
        }

        consoleMenuItem.Checked = consoleVisible;
    }

    private void OnConsole(object sender, EventArgs e)
    {
        ToggleConsole();
    }

    /// <summary>Lit le port CMS depuis l'env, config.toml, ou 1703 par défaut.</summary>
    private string GetCmsPort()
    {
        string envPort = Environment.GetEnvironmentVariable("PORT");
        if (!string.IsNullOrEmpty(envPort)) return envPort;

        string cfgPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".config", "hugocms", "config.toml");
        if (File.Exists(cfgPath))
        {
            try
            {
                string toml = File.ReadAllText(cfgPath);
                var m = Regex.Match(toml,
                    @"^cmsPort\s*=\s*(\d[_\d]*\d|\d)\s*$",
                    RegexOptions.Multiline);
                if (m.Success) return m.Groups[1].Value.Replace("_", "");
            }
            catch { }
        }
        return "1703";
    }

    private void OnOpen(object sender, EventArgs e)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = string.Format("http://localhost:{0}", GetCmsPort()),
                UseShellExecute = true
            });
        }
        catch { }
    }

    // =========================================================================
    // US-122 : Arrêter / Démarrer sans fermer le tray
    // =========================================================================

    /// <summary>
    /// Bascule entre "Démarrer le serveur" et "Arrêter le serveur".
    /// Le flag _isStoppingIntentionally empêche US-121 de montrer une
    /// notification de crash pour un arrêt volontaire.
    /// </summary>
    private void OnStop(object sender, EventArgs e)
    {
        if (serverProcess != null && !serverProcess.HasExited)
        {
            // Arrêter le serveur
            _isStoppingIntentionally = true;
            StopServer();
        }
        else
        {
            // Démarrer le serveur
            StartServer();
        }
    }

    /// <summary>
    /// Redémarrage : arrêt volontaire (pas de notification) puis démarrage.
    /// </summary>
    private void OnRestart(object sender, EventArgs e)
    {
        _isStoppingIntentionally = true;
        StopServer();
        StartServer();
    }

    /// <summary>
    /// Quitter : arrêt volontaire puis fermeture.
    /// </summary>
    private void OnQuit(object sender, EventArgs e)
    {
        _isStoppingIntentionally = true;
        StopServer();
        if (logWindow != null && !logWindow.IsDisposed)
            logWindow.Close();
        trayIcon.Visible = false;
        Application.Exit();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _isStoppingIntentionally = true;
            StopServer();

            if (trayIcon != null)
            {
                // Détruire l'icône non-base avant de disposer le NotifyIcon,
                // sinon le handle GDI natif fuit.
                Icon currentIcon = trayIcon.Icon;
                trayIcon.Icon = null;
                trayIcon.Dispose();
                if (currentIcon != null && currentIcon != _baseIcon)
                    DestroyIconSafe(currentIcon);
            }

            if (trayMenu != null)
                trayMenu.Dispose();
            if (logWindow != null && !logWindow.IsDisposed)
                logWindow.Dispose();
            if (_baseIcon != null)
                _baseIcon.Dispose();
        }
        base.Dispose(disposing);
    }

    /// <summary>
    /// Empêche la fenêtre du Form d'apparaître — seul le NotifyIcon est visible.
    /// </summary>
    protected override void SetVisibleCore(bool value)
    {
        if (!IsHandleCreated)
        {
            CreateHandle();
            value = false;
        }
        base.SetVisibleCore(value);
    }
}
