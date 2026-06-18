<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Terminal, Trash2 } from '@lucide/svelte';

	interface LogEntry {
		stream: 'stdout' | 'stderr';
		text: string;
		timestamp: number;
	}

	let { show, onClose, consoleHeight = $bindable(200) }: { show: boolean; onClose: () => void; consoleHeight?: number } = $props();

	let logs = $state<LogEntry[]>([]);
	let logEnd = $state<HTMLDivElement | null>(null);
	let polling = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let lastTs = $state(0);
	let autoScroll = $state(true);

	function startResize(e: PointerEvent) {
		e.preventDefault();
		const handle = e.currentTarget as HTMLElement;
		const startY = e.clientY;
		const startHeight = consoleHeight;
		handle.setPointerCapture(e.pointerId);
		document.body.style.cursor = 'row-resize';
		document.body.style.userSelect = 'none';

		function onMove(ev: PointerEvent) {
			const maxH = window.innerHeight * 0.6;
			const newH = Math.max(100, Math.min(maxH, startHeight - (ev.clientY - startY)));
			consoleHeight = newH;
		}

		function onUp() {
			handle.removeEventListener('pointermove', onMove);
			handle.removeEventListener('pointerup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}

		handle.addEventListener('pointermove', onMove);
		handle.addEventListener('pointerup', onUp);
	}

	$effect(() => {
		if (show && !polling) {
			polling = true;
			fetchLogs();
			pollTimer = setInterval(fetchLogs, 1500);
		} else if (!show && polling) {
			polling = false;
			if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
		}
	});

	onDestroy(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	async function fetchLogs() {
		try {
			const res = await fetch('/api/hugo/logs');
			const all = await res.json() as LogEntry[];
			logs = all;
			if (all.length > 0) {
				lastTs = all[all.length - 1].timestamp;
			}
			if (autoScroll) {
				requestAnimationFrame(() => {
					logEnd?.scrollIntoView({ behavior: 'smooth' });
				});
			}
		} catch {
			// ignore
		}
	}

	async function clearConsole() {
		try {
			await fetch('/api/hugo/logs', { method: 'DELETE' });
			logs = [];
		} catch {
			// ignore
		}
	}

	function onScroll(e: Event) {
		const el = e.currentTarget as HTMLElement;
		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
		autoScroll = nearBottom;
	}

	function formatTime(ts: number): string {
		const d = new Date(ts);
		return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}
</script>

{#if show}
	<div class="console-panel" style="height:{consoleHeight}px">
		<div class="console-resize-handle" role="presentation" onpointerdown={startResize}></div>
		<div class="console-header">
			<span class="console-title">
				<Terminal size={14} />
				Console Hugo
			</span>
			<span class="log-count">{logs.length} lignes</span>
			<div class="console-actions">
				<button class="console-btn" onclick={clearConsole} title="Effacer la console">
					<Trash2 size={13} />
				</button>
				<button class="console-btn" onclick={onClose} title="Fermer la console">
					×
				</button>
			</div>
		</div>
		<div class="console-body" onscroll={onScroll}>
			{#if logs.length === 0}
				<div class="console-empty">Aucune sortie Hugo pour l'instant.</div>
			{:else}
				{#each logs as entry, i}
					<div class="log-line" class:stderr={entry.stream === 'stderr'} class:first={i === 0}>
						<span class="log-time">{formatTime(entry.timestamp)}</span>
						<span class="log-stream">{entry.stream === 'stderr' ? 'ERR' : '   '}</span>
						<span class="log-text">{entry.text}</span>
					</div>
				{/each}
				<div bind:this={logEnd}></div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Console toujours en thème sombre, indépendant du thème de l'app — convention terminal */
	.console-panel {
		border-top: 1px solid var(--c-border);
		background: #1a1b1e;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		overflow: hidden;
		position: relative;
	}

	.console-resize-handle {
		height: 4px;
		flex-shrink: 0;
		cursor: row-resize;
		background: transparent;
		transition: background 0.15s;
		position: relative;
		z-index: 5;
	}

	.console-resize-handle:hover,
	.console-resize-handle:active {
		background: var(--c-primary);
	}

	.console-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-bottom: 1px solid #2a2b2e;
		background: #121314;
		flex-shrink: 0;
	}

	.console-title {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 500;
		color: #a0a0a0;
	}

	.log-count {
		font-size: 11px;
		color: #555;
		margin-right: auto;
	}

	.console-actions {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.console-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		color: #666;
		font-size: 15px;
		transition: all 0.12s;
	}

	.console-btn:hover {
		background: #2a2b2e;
		color: #ccc;
	}

	.console-body {
		flex: 1;
		overflow-y: auto;
		padding: 4px 0;
		font-family: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
		font-size: 12px;
		line-height: 1.5;
	}

	.console-empty {
		padding: 16px;
		color: #555;
		text-align: center;
		font-size: 12px;
		font-family: inherit;
	}

	.log-line {
		display: flex;
		gap: 8px;
		padding: 1px 12px;
		color: #c0c0c0;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.log-line.stderr {
		background: rgba(239, 68, 68, 0.08);
		color: #f87171;
	}

	.log-time {
		color: #555;
		flex-shrink: 0;
		font-size: 11px;
		width: 64px;
	}

	.log-stream {
		color: #555;
		flex-shrink: 0;
		font-family: inherit;
	}

	.log-text {
		flex: 1;
	}
</style>
