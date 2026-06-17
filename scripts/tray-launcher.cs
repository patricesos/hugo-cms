using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

class TrayLauncher : Form
{
    private NotifyIcon trayIcon;
    private Process serverProcess;
    private ContextMenuStrip trayMenu;
    private string appDir;
    private string nodePath;
    private static readonly string AppName = "Hugo CMS";

    [STAThread]
    static void Main(string[] args)
    {
        Console.Title = AppName;
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new TrayLauncher());
    }

    public TrayLauncher()
    {
        appDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        nodePath = FindNode();

        WriteColored("Hugo CMS Tray Launcher", ConsoleColor.Cyan);
        WriteColored("================================", ConsoleColor.DarkGray);
        WriteLog(string.Format("App directory: {0}", appDir));
        WriteLog(string.Format("Node path: {0}", nodePath));

        trayMenu = new ContextMenuStrip();
        trayMenu.Items.Add("Ouvrir dans le navigateur", null, OnOpen);
        trayMenu.Items.Add("-");
        trayMenu.Items.Add("Redemarrer", null, OnRestart);
        trayMenu.Items.Add("-");
        trayMenu.Items.Add("Quitter", null, OnQuit);

        trayIcon = new NotifyIcon();
        trayIcon.Text = AppName;
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
        {
            WriteColored("ERROR: No server entry found (bundle.mjs or build/index.js)", ConsoleColor.Red);
            return;
        }

        WriteLog(string.Format("Starting server: {0} {1}", nodePath, scriptPath));

        ProcessStartInfo psi = new ProcessStartInfo();
        psi.FileName = nodePath;
        psi.Arguments = string.Format("\"{0}\"", scriptPath);
        psi.WorkingDirectory = appDir;
        psi.UseShellExecute = false;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.CreateNoWindow = false;
        psi.StandardOutputEncoding = Encoding.UTF8;
        psi.StandardErrorEncoding = Encoding.UTF8;

        try
        {
            serverProcess = new Process();
            serverProcess.StartInfo = psi;
            serverProcess.OutputDataReceived += (s, e) =>
            {
                if (e.Data != null)
                    WriteLog(e.Data);
            };
            serverProcess.ErrorDataReceived += (s, e) =>
            {
                if (e.Data != null)
                    WriteColored(e.Data, ConsoleColor.Yellow);
            };
            serverProcess.EnableRaisingEvents = true;
            serverProcess.Exited += (s, e) =>
            {
                string msg = string.Format("Server process exited (code: {0})", serverProcess.ExitCode);
                WriteColored(msg, ConsoleColor.Red);
                serverProcess = null;
            };
            serverProcess.Start();
            serverProcess.BeginOutputReadLine();
            serverProcess.BeginErrorReadLine();
            WriteColored("Server started successfully", ConsoleColor.Green);
        }
        catch (Exception ex)
        {
            WriteColored(string.Format("Failed to start server: {0}", ex.Message), ConsoleColor.Red);
            serverProcess = null;
        }
    }

    private void StopServer()
    {
        if (serverProcess == null || serverProcess.HasExited)
            return;

        WriteLog("Stopping server...");
        try
        {
            if (!serverProcess.CloseMainWindow())
            {
                serverProcess.Kill();
            }
            if (!serverProcess.WaitForExit(5000))
            {
                serverProcess.Kill();
                serverProcess.WaitForExit(2000);
            }
            WriteLog("Server stopped");
        }
        catch (Exception ex)
        {
            WriteColored(string.Format("Error stopping server: {0}", ex.Message), ConsoleColor.Red);
        }
        serverProcess = null;
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
        catch (Exception ex)
        {
            WriteColored(string.Format("Error opening browser: {0}", ex.Message), ConsoleColor.Red);
        }
    }

    private void OnRestart(object sender, EventArgs e)
    {
        WriteColored("Restarting server...", ConsoleColor.Yellow);
        StopServer();
        StartServer();
        WriteColored("Server restarted", ConsoleColor.Green);
    }

    private void OnQuit(object sender, EventArgs e)
    {
        WriteColored("Shutting down...", ConsoleColor.Yellow);
        StopServer();
        trayIcon.Visible = false;
        Application.Exit();
    }

    private void WriteLog(string message)
    {
        string timestamp = DateTime.Now.ToString("HH:mm:ss");
        Console.WriteLine(string.Format("[{0}] {1}", timestamp, message));
    }

    private void WriteColored(string message, ConsoleColor color)
    {
        ConsoleColor original = Console.ForegroundColor;
        Console.ForegroundColor = color;
        Console.WriteLine(message);
        Console.ForegroundColor = original;
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

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            Hide();
        }
        base.OnFormClosing(e);
    }
}
