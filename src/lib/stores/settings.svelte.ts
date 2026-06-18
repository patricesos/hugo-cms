import { writable, derived, get } from "svelte/store";
import { editorStore } from './editor.svelte';

export interface SettingsData {
	defaultRawMode: boolean;
	showBubbleMenu: boolean;
	showSlashMenu: boolean;
	draftByDefault: boolean;
	autoSaveDelay: number;
	theme: string;
	editorFont: string;
	editorFontSize: string;
	editorMaxWidth: string;
	editorMaxWidthCustom: number;
	historyDepth: number;
	sidebarOpen: boolean;
	sidebarWidth: number;
	fmOpen: boolean;
	fmWidth: number;
	fmRawMode: boolean;
	sidebarView: string;
	showConsole: boolean;
	showPreview: boolean;
	showGit: boolean;
	showFilenameInTabs: boolean;
	gitRemote: string;
	gitBranch: string;
	hugoSitePathUseDotEnv: boolean;
	hugoSitePathCustom: string;
	hugoBindAddress: string;
	hugoPort: number;
	cmsBindAddress: string;
	cmsPort: number;
	trashDir: string;
}

export interface SettingsState {
  // Hugo config
  hugoSitePathUseDotEnv: boolean;
  hugoSitePathCustom: string;
  hugoBindAddress: string;
  hugoPort: number;
  // Editor preferences
  defaultRawMode: boolean;
  showBubbleMenu: boolean;
  showSlashMenu: boolean;
  draftByDefault: boolean;
  autoSaveDelay: number;
  theme: string;
  editorFont: string;
  editorFontSize: string;
  editorMaxWidth: string;
  editorMaxWidthCustom: number;
  historyDepth: number;
  showFilenameInTabs: boolean;
  // Git config
  gitRemote: string;
  gitBranch: string;

  // CMS config
  cmsBindAddress: string;
  cmsPort: number;
  trashDir: string;
}

export interface LayoutState {
  sidebarOpen: boolean;
  sidebarView: "content" | "static" | "archetypes" | "config";
  sidebarWidth: number;
  fmOpen: boolean;
  fmWidth: number;
  fmRawMode: boolean;
  showPreview: boolean;
  showConsole: boolean;
  showGit: boolean;
  consoleHeight: number;
  previewWidth: number;
  expandedSlugs: string[];
}

const SETTINGS_DEFAULTS: SettingsState = {
  defaultRawMode: false,
  showBubbleMenu: true,
  showSlashMenu: true,
  draftByDefault: true,
  autoSaveDelay: 2000,
  theme: "system",
  editorFont: "serif",
  editorFontSize: "normal",
  editorMaxWidth: "720px",
  editorMaxWidthCustom: 720,
  historyDepth: 250,
  showFilenameInTabs: false,
  gitRemote: "origin",
  gitBranch: "main",
  hugoSitePathUseDotEnv: true,
  hugoSitePathCustom: "",
  hugoBindAddress: "127.0.0.1",
  hugoPort: 1313,
  cmsBindAddress: "127.0.0.1",
  cmsPort: 1703,
  trashDir: "_trash",
};

const LAYOUT_DEFAULTS: LayoutState = {
  sidebarOpen: true,
  sidebarView: "content",
  sidebarWidth: 260,
  fmOpen: true,
  fmWidth: 280,
  fmRawMode: false,
  showPreview: false,
  showConsole: false,
  showGit: false,
  consoleHeight: 200,
  previewWidth: 480,
  expandedSlugs: [],
};

function createSettingsStore() {
  const settings = writable<SettingsState>({ ...SETTINGS_DEFAULTS });
  const layout = writable<LayoutState>({ ...LAYOUT_DEFAULTS });
  let _hydrated = false;

  function persist() {
    if (!_hydrated) return;
    const s = get(settings);
    const l = get(layout);
    const eTabs = get(editorStore.tabs);
    const eSlug = get(editorStore.currentSlug);
    const state = {
      tabs: eTabs.map(t => ({ slug: t.slug, title: t.title, frontmatterLanguage: t.frontmatterLanguage, kind: t.kind })),
      currentSlug: eSlug,
      settings: s,
      sidebarOpen: l.sidebarOpen,
      sidebarView: l.sidebarView,
      sidebarWidth: l.sidebarWidth,
      fmOpen: l.fmOpen,
      fmWidth: l.fmWidth,
      fmRawMode: l.fmRawMode,
      showPreview: l.showPreview,
      showConsole: l.showConsole,
      showGit: l.showGit,
      consoleHeight: l.consoleHeight,
      previewWidth: l.previewWidth,
      expandedSlugs: l.expandedSlugs,
    };
    try {
      localStorage.setItem("hugo-cms-state", JSON.stringify(state));
    } catch {}
    fetch("/api/user-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    }).catch(() => {});
  }

  settings.subscribe(persist);
  layout.subscribe(persist);
  editorStore.tabs.subscribe(persist);
  editorStore.currentSlug.subscribe(persist);

  return {
    settings,
    layout,

    updateSettings(partial: Partial<SettingsState>) {
      settings.update((s) => ({ ...s, ...partial }));
    },

    updateLayout(partial: Partial<LayoutState>) {
      layout.update((s) => ({ ...s, ...partial }));
    },

    setLayoutExpandedSlugs(slugs: Set<string>) {
      layout.update((s) => ({ ...s, expandedSlugs: [...slugs] }));
    },

    getExpandedSlugs(): Set<string> {
      return new Set(get(layout).expandedSlugs);
    },

    toggleExpandedSlug(slug: string) {
      layout.update((s) => {
        const next = new Set(s.expandedSlugs);
        if (next.has(slug)) next.delete(slug);
        else next.add(slug);
        return { ...s, expandedSlugs: [...next] };
      });
    },

    setHydrated() {
      _hydrated = true;
      persist();
    },

    /** Restaure depuis localStorage */
    restoreFromLocalStorage(): {
      tabs?: Array<{
        slug: string;
        title: string;
        frontmatterLanguage?: string;
        kind?: string;
        isImage?: boolean;
      }>;
      currentSlug?: string;
      showGit?: boolean;
    } | null {
      try {
        const raw = localStorage.getItem("hugo-cms-state");
        if (!raw) return null;
        const state = JSON.parse(raw);
        if (state.settings) {
          settings.update((s) => ({
            ...s,
            ...state.settings,
          }));
        }
        layout.update((l) => ({
          ...l,
          sidebarOpen: state.sidebarOpen ?? l.sidebarOpen,
          sidebarView: state.sidebarView ?? l.sidebarView,
          sidebarWidth: state.sidebarWidth ?? l.sidebarWidth,
          fmOpen: state.fmOpen ?? l.fmOpen,
          fmWidth: state.fmWidth ?? l.fmWidth,
          fmRawMode: state.fmRawMode ?? l.fmRawMode,
          showPreview: state.showPreview ?? l.showPreview,
          showConsole: state.showConsole ?? l.showConsole,
          showGit: state.showGit ?? l.showGit,
          consoleHeight: state.consoleHeight ?? l.consoleHeight,
          previewWidth: state.previewWidth ?? l.previewWidth,
          expandedSlugs: state.expandedSlugs ?? l.expandedSlugs,
        }));
        return {
          tabs: state.tabs,
          currentSlug: state.currentSlug,
          showGit: state.showGit,
        };
      } catch {
        return null;
      }
    },

	/** Restaure depuis l'API user-settings (fichier) */
	async restoreFromFile() {
		try {
			const res = await fetch("/api/user-settings");
			if (res.ok) {
				const data = (await res.json()) as Record<string, unknown>;
				settings.update((cur) => {
					const patch: Record<string, unknown> = {};
					for (const key of Object.keys(SETTINGS_DEFAULTS)) {
						if (data[key] !== undefined) patch[key] = data[key];
					}
					return { ...cur, ...patch } as SettingsState;
				});
			}
		} catch {
			/* ignore */
		}
	},

    /** Applique le theme au DOM */
    applyTheme() {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => {
        const t = get(settings).theme;
        if (t === "dark") document.documentElement.dataset.theme = "dark";
        else if (t === "light")
          document.documentElement.dataset.theme = "light";
        else
          document.documentElement.dataset.theme = mq.matches
            ? "dark"
            : "light";
      };
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    },

    snapshot() {
      return { settings: get(settings), layout: get(layout) };
    },
  };
}

export const settingsStore = createSettingsStore();

export const settingsData = derived(
	[settingsStore.settings, settingsStore.layout],
	([$s, $l]) =>
		({
			defaultRawMode: $s.defaultRawMode,
			showBubbleMenu: $s.showBubbleMenu,
			showSlashMenu: $s.showSlashMenu,
			draftByDefault: $s.draftByDefault,
			autoSaveDelay: $s.autoSaveDelay,
			theme: $s.theme,
			editorFont: $s.editorFont,
			editorFontSize: $s.editorFontSize,
			editorMaxWidth: $s.editorMaxWidth,
			editorMaxWidthCustom: $s.editorMaxWidthCustom,
			historyDepth: $s.historyDepth,
			sidebarOpen: $l.sidebarOpen,
			sidebarWidth: $l.sidebarWidth,
			fmOpen: $l.fmOpen,
			fmWidth: $l.fmWidth,
			fmRawMode: $l.fmRawMode,
			sidebarView: $l.sidebarView,
			showConsole: $l.showConsole,
			showPreview: $l.showPreview,
			showGit: $l.showGit,
			showFilenameInTabs: $s.showFilenameInTabs,
			gitRemote: $s.gitRemote,
			gitBranch: $s.gitBranch,
			hugoSitePathUseDotEnv: $s.hugoSitePathUseDotEnv,
			hugoSitePathCustom: $s.hugoSitePathCustom,
			hugoBindAddress: $s.hugoBindAddress,
			hugoPort: $s.hugoPort,
			cmsBindAddress: $s.cmsBindAddress,
			cmsPort: $s.cmsPort,
			trashDir: $s.trashDir,
		}) as SettingsData
);
