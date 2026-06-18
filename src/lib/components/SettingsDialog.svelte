<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { Settings, X } from '@lucide/svelte';
	import SettingsPanel from '$lib/settings/SettingsPanel.svelte';
	import { settingsSchema } from '$lib/settings/schema';

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
		sidebarWidth: number;
		fmOpen: boolean;
		fmWidth: number;
		fmRawMode: boolean;
		sidebarView: string;
		showConsole: boolean;
		showPreview: boolean;
		showGit: boolean;
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

	let { show = false, settings = {} as SettingsState, serverConfig = null, onClose, onSave, onConfirm }: {
		show: boolean;
		settings: SettingsState;
		serverConfig: Record<string, string | number | boolean> | null;
		onClose: () => void;
		onSave: (s: SettingsState) => void;
		onConfirm?: () => void;
	} = $props();

	let local = $state<SettingsState>({ defaultRawMode: false, showBubbleMenu: true, showSlashMenu: true, draftByDefault: true, autoSaveDelay: 2000, theme: 'system', editorFont: 'serif', editorFontSize: 'normal', editorMaxWidth: '720px', editorMaxWidthCustom: 720, historyDepth: 250, sidebarOpen: true, sidebarWidth: 260, fmOpen: true, fmWidth: 280, fmRawMode: false, sidebarView: 'content', showConsole: false, showPreview: false, showGit: false, gitRemote: 'origin', gitBranch: 'main', hugoSitePathUseDotEnv: true, hugoSitePathCustom: '', hugoBindAddress: '127.0.0.1', hugoPort: 1313, cmsBindAddress: '127.0.0.1', cmsPort: 1703, trashDir: '_trash' });
	let snapshot = $state<SettingsState>({ defaultRawMode: false, showBubbleMenu: true, showSlashMenu: true, draftByDefault: true, autoSaveDelay: 2000, theme: 'system', editorFont: 'serif', editorFontSize: 'normal', editorMaxWidth: '720px', editorMaxWidthCustom: 720, historyDepth: 250, sidebarOpen: true, sidebarWidth: 260, fmOpen: true, fmWidth: 280, fmRawMode: false, sidebarView: 'content', showConsole: false, showPreview: false, showGit: false, gitRemote: 'origin', gitBranch: 'main', hugoSitePathUseDotEnv: true, hugoSitePathCustom: '', hugoBindAddress: '127.0.0.1', hugoPort: 1313, cmsBindAddress: '127.0.0.1', cmsPort: 1703, trashDir: '_trash' });

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
		onConfirm?.();
		onClose();
	}

	function handleCancel() {
		onSave(snapshot);
		onClose();
	}

	function handleFieldChange(key: string, val: any) {
		(local as any)[key] = val;
		emit();
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
			<SettingsPanel
				schema={settingsSchema}
				values={local}
				{serverConfig}
				onChange={handleFieldChange}
			/>
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
		border-radius: var(--radius-xl);
		width: 680px;
		max-width: calc(100vw - 32px);
		height: 640px;
		max-height: calc(100vh - 64px);
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
		flex-shrink: 0;
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
		padding: 12px 16px;
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.dialog-footer {
		display: flex;
		gap: 8px;
		padding: 0 16px 16px;
		justify-content: flex-end;
		flex-shrink: 0;
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
