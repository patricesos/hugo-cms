using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

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

    private const int SW_HIDE = 0;
    private const int SW_SHOW = 5;

    private NotifyIcon trayIcon;
    private Process serverProcess;
    private ContextMenuStrip trayMenu;
    private ToolStripMenuItem consoleMenuItem;
    private LogWindow logWindow;
    private string appDir;
    private string nodePath;
    private bool consoleVisible = false;

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

        trayMenu = new ContextMenuStrip();
        trayMenu.Items.Add("Ouvrir dans le navigateur", null, OnOpen);
        trayMenu.Items.Add("-");
        consoleMenuItem = new ToolStripMenuItem("Console", null, OnConsole);
        consoleMenuItem.Checked = false;
        trayMenu.Items.Add(consoleMenuItem);
        trayMenu.Items.Add("-");
        trayMenu.Items.Add("Redemarrer", null, OnRestart);
        trayMenu.Items.Add("-");
        trayMenu.Items.Add("Quitter", null, OnQuit);

        trayIcon = new NotifyIcon();
        trayIcon.Text = "Hugo CMS";
        trayIcon.Icon = LoadIcon();
        trayIcon.ContextMenuStrip = trayMenu;
        trayIcon.Visible = true;
        trayIcon.DoubleClick += OnOpen;

        StartServer();
    }

    private Icon LoadIcon()
    {
        string icoPath = Path.Combine(appDir, "hugo-cms.ico");
        if (File.Exists(icoPath))
            return new Icon(icoPath);
        return SystemIcons.Application;
    }

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

        // Force logWindow handle so InvokeRequired works from any thread
        IntPtr tmp = logWindow.Handle;

        ProcessStartInfo psi = new ProcessStartInfo();
        psi.FileName = nodePath;
        psi.Arguments = string.Format("\"{0}\"", scriptPath);
        psi.WorkingDirectory = appDir;
        psi.UseShellExecute = false;
        psi.CreateNoWindow = true;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;

        try
        {
            serverProcess = new Process();
            serverProcess.StartInfo = psi;
            serverProcess.EnableRaisingEvents = true;

            serverProcess.OutputDataReceived += (s, e) =>
            {
                if (e.Data != null)
                    logWindow.Append(string.Format("[{0}] {1}{2}", DateTime.Now.ToString("HH:mm:ss"), e.Data, Environment.NewLine));
            };

            serverProcess.ErrorDataReceived += (s, e) =>
            {
                if (e.Data != null)
                    logWindow.Append(string.Format("[{0}] ERR {1}{2}", DateTime.Now.ToString("HH:mm:ss"), e.Data, Environment.NewLine));
            };

            serverProcess.Exited += (s, e) =>
            {
                logWindow.Append(string.Format("[{0}] Server stopped.{1}", DateTime.Now.ToString("HH:mm:ss"), Environment.NewLine));
                serverProcess = null;
            };

            serverProcess.Start();
            serverProcess.BeginOutputReadLine();
            serverProcess.BeginErrorReadLine();

            consoleVisible = false;
            consoleMenuItem.Checked = false;
        }
        catch (Exception)
        {
            serverProcess = null;
        }
    }

    private void StopServer()
    {
        if (serverProcess == null || serverProcess.HasExited)
            return;

        try
        {
            logWindow.Append(string.Format("[{0}] Stopping server...{1}", DateTime.Now.ToString("HH:mm:ss"), Environment.NewLine));
            serverProcess.Kill();
            serverProcess.WaitForExit(2000);
        }
        catch { }
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

    private void OnOpen(object sender, EventArgs e)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "http://localhost:3000",
                UseShellExecute = true
            });
        }
        catch { }
    }

    private void OnRestart(object sender, EventArgs e)
    {
        StopServer();
        StartServer();
    }

    private void OnQuit(object sender, EventArgs e)
    {
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
            StopServer();
            if (trayIcon != null)
                trayIcon.Dispose();
            if (trayMenu != null)
                trayMenu.Dispose();
            if (logWindow != null && !logWindow.IsDisposed)
                logWindow.Dispose();
        }
        base.Dispose(disposing);
    }

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
