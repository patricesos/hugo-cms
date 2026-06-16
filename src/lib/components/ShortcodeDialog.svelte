<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Zap, X, FileCode, Type, Braces } from '@lucide/svelte';

	let {
		show = false,
		onInsert,
		onClose,
	}: {
		show: boolean;
		onInsert: (shortcode: string) => void;
		onClose: () => void;
	} = $props();

	let name = $state('');
	let params = $state('');
	let innerContent = $state('');
	let nameInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (show && nameInput) {
			nameInput.focus();
		}
	});

	function buildShortcode(): string {
		let sc = `{{< ${name}`;
		if (params.trim()) sc += ` ${params.trim()}`;
		sc += ' >}}';
		if (innerContent.trim()) {
			sc += `\n${innerContent.trimEnd()}\n{{< /${name} >}}`;
		}
		return sc;
	}

	function handleInsert() {
		if (!name.trim()) return;
		onInsert(buildShortcode());
	}

	const preview = $derived(name.trim() ? buildShortcode() : '');

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleInsert();
		} else if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if show}
	<div class="sc-backdrop" role="presentation" transition:fade={{ duration: 100 }} onclick={onClose}></div>
	<div class="sc-dialog" role="dialog" tabindex="-1" transition:fade={{ duration: 120 }} onkeydown={handleKeydown}>
		<div class="sc-header">
			<Zap size={16} />
			<span>Insérer un shortcode Hugo</span>
			<button class="sc-close" onclick={onClose} title="Fermer"><X size={16} /></button>
		</div>

		<div class="sc-body">
			<label class="sc-field">
				<span class="sc-label"><FileCode size={14} /> Nom *</span>
				<input
					bind:this={nameInput}
					type="text"
					class="sc-input"
					placeholder="ex: figure, highlight, alert…"
					bind:value={name}
				/>
			</label>

			<label class="sc-field">
				<span class="sc-label"><Braces size={14} /> Paramètres</span>
				<input
					type="text"
					class="sc-input"
					placeholder='ex: src="image.jpg" alt="photo" class="center"'
					bind:value={params}
				/>
			</label>

			<label class="sc-field">
				<span class="sc-label"><Type size={14} /> Contenu (optionnel)</span>
				<textarea
					class="sc-textarea"
					placeholder="Contenu à encadrer par le shortcode…"
					bind:value={innerContent}
					rows={3}
				></textarea>
			</label>

			{#if preview}
				<div class="sc-preview">
					<span class="sc-preview-label">Aperçu</span>
					<code class="sc-preview-code">{preview}</code>
				</div>
			{/if}
		</div>

		<div class="sc-footer">
			<button class="sc-btn secondary" onclick={onClose}>Annuler</button>
			<button class="sc-btn primary" onclick={handleInsert} disabled={!name.trim()}>Insérer</button>
		</div>
	</div>
{/if}

<style>
	.sc-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.35);
		z-index: 200;
	}

	.sc-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 480px;
		max-width: calc(100vw - 40px);
		max-height: calc(100vh - 80px);
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xl);
		z-index: 201;
		display: flex;
		flex-direction: column;
	}

	.sc-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}

	.sc-close {
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

	.sc-close:hover { background: var(--c-bg-muted); color: var(--c-text); }

	.sc-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		overflow-y: auto;
	}

	.sc-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.sc-label {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		font-weight: 600;
		color: var(--c-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.sc-input {
		padding: 8px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 14px;
		font-family: var(--font-mono);
		outline: none;
		transition: border-color 0.12s;
	}

	.sc-input:focus { border-color: var(--c-primary); }

	.sc-input::placeholder { color: var(--c-text-muted); }

	.sc-textarea {
		padding: 8px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 14px;
		font-family: var(--font-mono);
		outline: none;
		resize: vertical;
		min-height: 60px;
		transition: border-color 0.12s;
	}

	.sc-textarea:focus { border-color: var(--c-primary); }

	.sc-textarea::placeholder { color: var(--c-text-muted); }

	.sc-preview {
		background: var(--c-bg-muted);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		padding: 10px 12px;
	}

	.sc-preview-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--c-text-muted);
		display: block;
		margin-bottom: 6px;
	}

	.sc-preview-code {
		display: block;
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--c-text);
		word-break: break-all;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.sc-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--c-border);
	}

	.sc-btn {
		padding: 7px 16px;
		border-radius: var(--radius-md);
		border: 1px solid var(--c-border);
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.1s;
	}

	.sc-btn.primary {
		background: var(--c-primary);
		color: #fff;
		border-color: var(--c-primary);
	}

	.sc-btn.primary:hover { opacity: 0.9; }

	.sc-btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }

	.sc-btn.secondary { background: var(--c-bg); color: var(--c-text); }

	.sc-btn.secondary:hover { background: var(--c-bg-muted); }
</style>
