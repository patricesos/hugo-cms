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
	let appVersion = $state('');
	let nodeVersion = $state('');
	let hugoVersion = $state('');
	let hugoVersionFull = $state('');

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

	$effect(() => {
		if (show) {
			fetch('/api/version')
				.then(r => r.json())
				.then(data => {
					appVersion = data.appVersion ?? '';
					nodeVersion = data.nodeVersion ?? '';
					hugoVersion = data.hugoVersion ?? '';
					hugoVersionFull = data.hugoVersionFull ?? '';
				})
				.catch(() => {});
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

{#if show}
	<div class="ab-backdrop" role="presentation" transition:fade={{ duration: 100 }} onclick={onClose}></div>
	<div class="ab-dialog" bind:this={dialogEl} role="dialog" tabindex="-1" transition:fade={{ duration: 120 }} onkeydown={handleKeydown}>
		<div class="ab-header">
			<span>À propos</span>
			<button class="ab-close" onclick={onClose} title="Fermer"><X size={16} /></button>
		</div>
		<div class="ab-body">
			<div class="ab-row">
				<img src="/favicon.svg" alt="" class="ab-logo" />
				<span class="ab-label">Application</span>
				<span class="ab-value">Hugo CMS {appVersion}</span>
			</div>
			<div class="ab-row">
				<img src="/node-logo.svg" alt="" class="ab-logo" />
				<span class="ab-label">Node.js</span>
				<span class="ab-value">{nodeVersion || '…'}</span>
			</div>
			<div class="ab-row">
				<img src="/hugo-logo.svg" alt="" class="ab-logo hugo-logo" />
				<span class="ab-label">Hugo</span>
				<div class="ab-value-stack">
					<span class="ab-value">{hugoVersion || '…'}</span>
					<span class="ab-value-sub">{hugoVersionFull || ''}</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.ab-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.35);
		z-index: 300;
	}

	.ab-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 380px;
		max-width: calc(100vw - 40px);
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xl);
		z-index: 301;
		overflow: hidden;
	}

	.ab-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		font-weight: 600;
		font-size: 14px;
	}

	.ab-close {
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

	.ab-close:hover { background: var(--c-bg-muted); color: var(--c-text); }

	.ab-body {
		padding: 12px 0;
	}

	.ab-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		font-size: 13px;
	}

	.ab-logo {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.hugo-logo {
		width: 40px;
		height: auto;
	}

	.ab-label {
		min-width: 80px;
		flex-shrink: 0;
		color: var(--c-text-secondary);
		font-weight: 500;
	}

	.ab-value {
		color: var(--c-text);
		font-family: monospace;
		font-size: 12px;
		word-break: break-all;
	}

	.ab-value-stack {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.ab-value-sub {
		color: var(--c-text-muted);
		font-family: monospace;
		font-size: 10px;
		word-break: break-all;
		line-height: 1.3;
	}
</style>
