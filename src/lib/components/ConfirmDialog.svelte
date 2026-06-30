<script lang="ts">
	import { confirmStore } from '$lib/stores/confirm.svelte';

	function handleConfirm() {
		confirmStore.resolve(true);
	}

	function handleCancel() {
		confirmStore.resolve(false);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { handleCancel(); }
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $confirmStore.show}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="overlay" role="presentation" onclick={handleCancel}>
		<div
			class="dialog"
			role="alertdialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="header">
				<h3>{$confirmStore.title}</h3>
				<button class="btn-close" onclick={handleCancel}>✕</button>
			</div>

			<p class="message">{$confirmStore.message}</p>

			<div class="actions">
				<button class="btn-cancel" onclick={handleCancel}>Annuler</button>
				<button class="btn-confirm" onclick={handleConfirm}>Confirmer</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 300;
	}

	.dialog {
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		width: 400px;
		max-width: calc(100vw - 32px);
		padding: 24px;
		box-shadow: var(--shadow-lg);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.header h3 {
		margin: 0;
		font-size: 15px;
		color: var(--c-text);
	}

	.btn-close {
		border: none;
		background: transparent;
		color: var(--c-text-muted);
		cursor: pointer;
		font-size: 16px;
		padding: 4px;
		line-height: 1;
		border-radius: var(--radius-sm);
	}

	.btn-close:hover {
		color: var(--c-text);
		background: var(--c-bg-muted);
	}

	.message {
		margin: 0 0 20px;
		font-size: 13px;
		color: var(--c-text-secondary);
		line-height: 1.5;
		white-space: pre-wrap;
	}

	.actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	.btn-cancel {
		padding: 8px 18px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--c-text);
		font-size: 13px;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-cancel:hover {
		background: var(--c-bg-muted);
	}

	.btn-confirm {
		padding: 8px 18px;
		border: 1px solid var(--c-danger, #c0392b);
		border-radius: var(--radius-md);
		background: var(--c-danger, #c0392b);
		color: white;
		font-size: 13px;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-confirm:hover {
		opacity: 0.85;
	}
</style>
