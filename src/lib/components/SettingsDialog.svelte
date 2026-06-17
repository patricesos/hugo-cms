<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { Settings, PenTool, X } from '@lucide/svelte';

	interface SettingsState {
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
		fmOpen: boolean;
		showConsole: boolean;
		showPreview: boolean;
		showGit: boolean;
	}

	let { show = false, settings = {} as SettingsState, onClose, onSave }: {
		show: boolean;
		settings: SettingsState;
		onClose: () => void;
		onSave: (s: SettingsState) => void;
	} = $props();

	let local = $state<SettingsState>({ defaultRawMode: false, showBubbleMenu: true, showSlashMenu: true, draftByDefault: true, autoSaveDelay: 2000, theme: 'system', editorFont: 'serif', editorFontSize: 'normal', editorMaxWidth: '720px', editorMaxWidthCustom: 720, historyDepth: 250, sidebarOpen: true, fmOpen: true, showConsole: false, showPreview: false, showGit: false });
	let snapshot = $state<SettingsState>({ defaultRawMode: false, showBubbleMenu: true, showSlashMenu: true, draftByDefault: true, autoSaveDelay: 2000, theme: 'system', editorFont: 'serif', editorFontSize: 'normal', editorMaxWidth: '720px', editorMaxWidthCustom: 720, historyDepth: 250, sidebarOpen: true, fmOpen: true, showConsole: false, showPreview: false, showGit: false });

	$effect(() => {
		if (show) {
			local = { ...settings };
			snapshot = { ...settings };
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function emit() {
		onSave(local);
	}

	function handleSave() {
		onSave(local);
		onClose();
	}

	function handleCancel() {
		onSave(snapshot);
		onClose();
	}
</script>

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="overlay" role="presentation" transition:fade={{ duration: 120 }} onclick={onClose}></div>
	<div
		class="dialog"
		role="dialog"
		aria-modal="true"
		aria-label="Paramètres"
		tabindex="-1"
		transition:fly={{ duration: 160, y: 20 }}
		onclick={(e) => e.stopPropagation()}
		onkeydown={handleKeydown}
	>
		<div class="dialog-header">
			<Settings size={16} />
			<h3>Paramètres</h3>
			<button class="icon-btn close-btn" onclick={onClose} title="Fermer"><X size={14} /></button>
		</div>

		<div class="dialog-body">
			<div class="section">
				<div class="section-title"><PenTool size={13} /> Apparence</div>
				<label class="toggle-row">
					<span>Thème</span>
					<select value={local.theme} onchange={(e) => { const el = e.target as HTMLSelectElement; local.theme = el.value; emit(); }} class="select-input">
						<option value="system">Système</option>
						<option value="light">Clair</option>
						<option value="dark">Sombre</option>
					</select>
				</label>
				<label class="toggle-row">
					<span>Taille police éditeur</span>
					<select value={local.editorFontSize} onchange={(e) => { const el = e.target as HTMLSelectElement; local.editorFontSize = el.value; emit(); }} class="select-input">
						<option value="small">Petite</option>
						<option value="normal">Normale</option>
						<option value="large">Grande</option>
					</select>
				</label>
				<label class="toggle-row">
					<span>Largeur max éditeur</span>
					<select value={local.editorMaxWidth} onchange={(e) => { const el = e.target as HTMLSelectElement; local.editorMaxWidth = el.value; emit(); }} class="select-input">
						<option value="720px">720px</option>
						<option value="100%">100%</option>
						<option value="custom">Personnalisée</option>
					</select>
				</label>
				{#if local.editorMaxWidth === 'custom'}
				<label class="toggle-row">
					<span>Largeur perso (px)</span>
					<input type="number" min="400" max="2000" step="10" value={local.editorMaxWidthCustom} oninput={(e) => { const el = e.target as HTMLInputElement; local.editorMaxWidthCustom = parseInt(el.value, 10) || 720; emit(); }} class="number-input" />
				</label>
				{/if}
			</div>
			<div class="section">
				<div class="section-title"><PenTool size={13} /> Éditeur</div>
				<label class="toggle-row">
					<span>Mode brut par défaut</span>
					<input type="checkbox" checked={local.defaultRawMode} onchange={(e) => { const el = e.target as HTMLInputElement; local.defaultRawMode = el.checked; emit(); }} />
				</label>
				<label class="toggle-row">
					<span>Menu flottant (sélection)</span>
					<input type="checkbox" checked={local.showBubbleMenu} onchange={(e) => { const el = e.target as HTMLInputElement; local.showBubbleMenu = el.checked; emit(); }} />
				</label>
				<label class="toggle-row">
					<span>Menu slash (/)</span>
					<input type="checkbox" checked={local.showSlashMenu} onchange={(e) => { const el = e.target as HTMLInputElement; local.showSlashMenu = el.checked; emit(); }} />
				</label>
				<label class="toggle-row">
					<span>Brouillon par défaut</span>
					<input type="checkbox" checked={local.draftByDefault} onchange={(e) => { const el = e.target as HTMLInputElement; local.draftByDefault = el.checked; emit(); }} />
				</label>
				<label class="toggle-row">
					<span>Auto-save (ms)</span>
					<input type="number" min="500" max="30000" step="100" value={local.autoSaveDelay} oninput={(e) => { const el = e.target as HTMLInputElement; local.autoSaveDelay = parseInt(el.value, 10) || 2000; emit(); }} class="number-input" />
				</label>
				<label class="toggle-row">
					<span>Police éditeur</span>
					<select value={local.editorFont} onchange={(e) => { const el = e.target as HTMLSelectElement; local.editorFont = el.value; emit(); }} class="select-input">
						<option value="serif">Serif (Georgia)</option>
						<option value="sans">Sans-serif (Open Sans)</option>
						<option value="mono">Monospace</option>
						<option value="system-ui">System UI</option>
					</select>
				</label>
				<label class="toggle-row">
					<span>Undo/redo max</span>
					<input type="number" min="10" max="10000" step="10" value={local.historyDepth} oninput={(e) => { const el = e.target as HTMLInputElement; local.historyDepth = parseInt(el.value, 10) || 250; emit(); }} class="number-input" />
				</label>
			</div>
			<div class="section">
				<div class="section-title"><PenTool size={13} /> Panneaux</div>
				<label class="toggle-row">
					<span>Sidebar ouverte</span>
					<input type="checkbox" checked={local.sidebarOpen} onchange={(e) => { const el = e.target as HTMLInputElement; local.sidebarOpen = el.checked; emit(); }} />
				</label>
				<label class="toggle-row">
					<span>Frontmatter ouvert</span>
					<input type="checkbox" checked={local.fmOpen} onchange={(e) => { const el = e.target as HTMLInputElement; local.fmOpen = el.checked; emit(); }} />
				</label>
				<label class="toggle-row">
					<span>Console Hugo</span>
					<input type="checkbox" checked={local.showConsole} onchange={(e) => { const el = e.target as HTMLInputElement; local.showConsole = el.checked; emit(); }} />
				</label>
				<label class="toggle-row">
					<span>Aperçu Hugo</span>
					<input type="checkbox" checked={local.showPreview} onchange={(e) => { const el = e.target as HTMLInputElement; local.showPreview = el.checked; emit(); }} />
				</label>
			</div>
			<div class="section">
				<div class="section-title"><PenTool size={13} /> Git</div>
				<label class="toggle-row">
					<span>Git intégré activé</span>
					<input type="checkbox" checked={local.showGit} onchange={(e) => { const el = e.target as HTMLInputElement; local.showGit = el.checked; emit(); }} />
				</label>
			</div>
		</div>

		<div class="dialog-footer">
			<button class="btn secondary" onclick={handleCancel}>Annuler</button>
			<button class="btn primary" onclick={handleSave}>Enregistrer</button>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		z-index: 200;
	}

	.dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 201;
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: 10px;
		width: 380px;
		max-width: calc(100vw - 32px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		display: flex;
		flex-direction: column;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px 16px 0;
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}

	.dialog-header h3 {
		margin: 0;
		flex: 1;
		font-size: 14px;
	}

	.close-btn {
		width: 26px;
		height: 26px;
	}

	.dialog-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
		color: var(--c-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding-bottom: 4px;
		border-bottom: 1px solid var(--c-border);
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 0;
		font-size: 13px;
		color: var(--c-text);
		cursor: pointer;
	}

	.select-input {
		padding: 3px 6px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
	}

	.number-input {
		width: 80px;
		padding: 3px 6px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		text-align: right;
	}

	.toggle-row input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--c-primary);
	}

	.dialog-footer {
		display: flex;
		gap: 8px;
		padding: 0 16px 16px;
		justify-content: flex-end;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-text-muted);
		cursor: pointer;
		transition: all 0.1s;
		flex-shrink: 0;
	}

	.icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 7px 14px;
		border-radius: var(--radius-md);
		font-size: 12px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.12s;
		border: 1px solid transparent;
	}

	.btn.primary {
		background: var(--c-primary);
		color: #fff;
	}

	.btn.primary:hover {
		background: var(--c-primary-hover);
	}

	.btn.secondary {
		background: var(--c-bg);
		color: var(--c-text-secondary);
		border-color: var(--c-border);
	}

	.btn.secondary:hover {
		background: var(--c-bg-muted);
	}
</style>
