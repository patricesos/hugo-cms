<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { X } from '@lucide/svelte';

	let {
		show = false,
		onClose,
	}: {
		show: boolean;
		onClose: () => void;
	} = $props();

	let dialogEl = $state<HTMLDivElement | null>(null);

	const shortcuts = [
		{ keys: ['⌘P', 'Ctrl+P'], label: 'Recherche globale' },
		{ keys: ['/'], label: 'Menu de commandes (dans l\'éditeur)' },
		{ keys: ['⌘S', 'Ctrl+S'], label: 'Sauvegarder' },
		{ keys: ['⌘Z', 'Ctrl+Z'], label: 'Annuler' },
		{ keys: ['⌘⇧Z', 'Ctrl+Shift+Z'], label: 'Rétablir' },
		{ keys: ['⌘B', 'Ctrl+B'], label: 'Gras' },
		{ keys: ['⌘I', 'Ctrl+I'], label: 'Italique' },
		{ keys: ['⌘K', 'Ctrl+K'], label: 'Insérer un lien' },
		{ keys: ['⌘⇧P', 'Ctrl+Shift+P'], label: 'Aperçu Hugo' },
		{ keys: ['⌘R', 'Ctrl+R'], label: 'Basculer éditeur WYSIWYG / Markdown' },
		{ keys: ['?'], label: 'Aide (ce panneau)' },
		{ keys: ['Échap'], label: 'Fermer les dialogues / popups' },
	];

	onMount(() => {
		function trapFocus(e: KeyboardEvent) {
			if (e.key !== 'Tab' || !dialogEl) return;
			const focusable = dialogEl.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
		document.addEventListener('keydown', trapFocus);
		return () => document.removeEventListener('keydown', trapFocus);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

{#if show}
	<div class="sh-backdrop" role="presentation" transition:fade={{ duration: 100 }} onclick={onClose}></div>
	<div class="sh-dialog" bind:this={dialogEl} role="dialog" tabindex="-1" transition:fade={{ duration: 120 }} onkeydown={handleKeydown}>
		<div class="sh-header">
			<span>Raccourcis clavier</span>
			<button class="sh-close" onclick={onClose} title="Fermer"><X size={16} /></button>
		</div>
		<div class="sh-body">
			{#each shortcuts as s}
				<div class="sh-row">
					<div class="sh-keys">
						{#each s.keys as key}
							<kbd>{key}</kbd>
						{/each}
					</div>
					<span class="sh-label">{s.label}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.sh-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.35);
		z-index: 300;
	}

	.sh-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 400px;
		max-width: calc(100vw - 40px);
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xl);
		z-index: 301;
		overflow: hidden;
	}

	.sh-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		font-weight: 600;
		font-size: 14px;
	}

	.sh-close {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--c-text-muted);
		transition: all 0.1s;
	}

	.sh-close:hover { background: var(--c-bg-muted); color: var(--c-text); }

	.sh-body {
		padding: 8px 0;
		max-height: 400px;
		overflow-y: auto;
	}

	.sh-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		font-size: 13px;
	}

	.sh-keys {
		display: flex;
		gap: 4px;
		min-width: 110px;
		flex-shrink: 0;
	}

	.sh-keys kbd {
		font-size: 11px;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		background: var(--c-bg-muted);
		border: 1px solid var(--c-border);
		font-family: inherit;
		color: var(--c-text);
	}

	.sh-label {
		color: var(--c-text-secondary);
	}
</style>
