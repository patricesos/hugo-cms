<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { Search, FileText, ArrowUpDown } from '@lucide/svelte';

	interface SearchEntry {
		slug: string;
		title: string;
		type: 'file' | 'directory';
	}

	let {
		show = false,
		entries = [] as SearchEntry[],
		onSelect,
		onClose,
	}: {
		show: boolean;
		entries: SearchEntry[];
		onSelect: (slug: string) => void;
		onClose: () => void;
	} = $props();

	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (show) {
			query = '';
			selectedIndex = 0;
		}
	});

	$effect(() => {
		if (show && inputEl) {
			inputEl.focus();
		}
	});

	function fuzzyMatch(text: string, q: string): boolean {
		const lower = text.toLowerCase();
		const qLower = q.toLowerCase();
		let qi = 0;
		for (let i = 0; i < lower.length && qi < qLower.length; i++) {
			if (lower[i] === qLower[qi]) qi++;
		}
		return qi === qLower.length;
	}

	const results = $derived(
		query.length < 2
			? entries
			: entries
				.filter((e) => fuzzyMatch(e.slug, query) || fuzzyMatch(e.title, query))
	);

	$effect(() => {
		if (selectedIndex >= results.length) {
			selectedIndex = Math.max(0, results.length - 1);
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter' && results[selectedIndex]) {
			e.preventDefault();
			onSelect(results[selectedIndex].slug);
			onClose();
		} else if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if show}
	<div class="search-backdrop" role="presentation" transition:fade={{ duration: 100 }} onclick={onClose}></div>
	<div class="search-dialog" role="dialog" tabindex="-1" transition:slide={{ duration: 150, axis: 'y' }} onkeydown={handleKeydown}>
		<div class="search-input-wrap">
			<Search size={16} />
			<input
				bind:this={inputEl}
				type="text"
				class="search-input"
				placeholder="Rechercher un fichier…"
				bind:value={query}
			/>
			<kbd class="search-hint">ESC</kbd>
		</div>
		<div class="search-results" class:empty={results.length === 0}>
			{#if results.length === 0}
				<div class="search-empty">Aucun résultat</div>
			{:else}
				{#each results as entry, i}
					<button
						class="search-item"
						class:selected={i === selectedIndex}
						onclick={() => { onSelect(entry.slug); onClose(); }}
						onmouseenter={() => selectedIndex = i}
					>
						<span class="si-icon"><FileText size={14} /></span>
						<span class="si-title">{entry.title}</span>
						<span class="si-slug">{entry.slug}.md</span>
					</button>
				{/each}
			{/if}
		</div>
		<div class="search-footer">
			<ArrowUpDown size={12} />
			<span>Navigation</span>
			<kbd>↵</kbd><span>Sélectionner</span>
		</div>
	</div>
{/if}

<style>
	.search-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.35);
		z-index: 100;
	}

	.search-dialog {
		position: fixed;
		top: 80px;
		left: 50%;
		transform: translateX(-50%);
		width: 520px;
		max-width: calc(100vw - 40px);
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xl);
		z-index: 101;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.search-input-wrap {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		color: var(--c-text-muted);
	}

	.search-input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-size: 15px;
		font-family: inherit;
		color: var(--c-text);
	}

	.search-input::placeholder {
		color: var(--c-text-muted);
	}

	.search-hint {
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--c-bg-muted);
		color: var(--c-text-muted);
		border: 1px solid var(--c-border);
		font-family: inherit;
	}

	.search-results {
		max-height: 360px;
		overflow-y: auto;
		padding: 6px;
	}

	.search-empty {
		padding: 24px 16px;
		text-align: center;
		color: var(--c-text-muted);
		font-size: 13px;
	}

	.search-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 9px 12px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		font-size: 13px;
		transition: all 0.08s;
	}

	.search-item:hover,
	.search-item.selected {
		background: var(--c-bg-muted);
	}

	.si-icon {
		display: flex;
		align-items: center;
		color: var(--c-text-muted);
		flex-shrink: 0;
	}

	.si-title {
		flex: 1;
		font-weight: 500;
		color: var(--c-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.si-slug {
		font-size: 11px;
		color: var(--c-text-muted);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.search-footer {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-top: 1px solid var(--c-border);
		font-size: 11px;
		color: var(--c-text-muted);
	}

	.search-footer span {
		margin-right: 6px;
	}

	.search-footer kbd {
		font-size: 10px;
		padding: 1px 5px;
		border-radius: 3px;
		background: var(--c-bg-muted);
		border: 1px solid var(--c-border);
		font-family: inherit;
		margin-right: 2px;
	}
</style>
