<script lang="ts">
	import { FileImage, Download, ExternalLink, Copy, ZoomIn, ZoomOut, Maximize2 } from '@lucide/svelte';

	let {
		slug = '',
		assetUrl = '',
	}: {
		slug: string;
		assetUrl: string;
	} = $props();

	let naturalWidth = $state(0);
	let naturalHeight = $state(0);
	let fileSize = $state('');

	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let panStartX = $state(0);
	let panStartY = $state(0);
	let panStartPanX = $state(0);
	let panStartPanY = $state(0);

	const MIN_SCALE = 1;
	const MAX_SCALE = 10;

	$effect(() => {
		if (!assetUrl) return;
		const img = new Image();
		img.onload = () => {
			naturalWidth = img.naturalWidth;
			naturalHeight = img.naturalHeight;
		};
		img.src = assetUrl;
	});

	$effect(() => {
		if (!assetUrl) return;
		const controller = new AbortController();
		fetch(assetUrl, { method: 'HEAD', signal: controller.signal })
			.then(r => {
				const size = r.headers.get('Content-Length');
				if (size) {
					const bytes = parseInt(size, 10);
					fileSize = bytes < 1024 ? `${bytes} o` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} Ko` : `${(bytes / 1048576).toFixed(1)} Mo`;
				}
			})
			.catch(() => {});
		return () => controller.abort();
	});

	const zoomPercent = $derived(Math.round(scale * 100));

	function clampScale(v: number) {
		return Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));
	}

	function setScale(v: number) {
		scale = clampScale(Math.max(v, 1));
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = -e.deltaY * 0.002;
		setScale(scale + delta);
	}

	function handleDoubleClick() {
		scale = 1;
		panX = 0;
		panY = 0;
	}

	function handleMouseDown(e: MouseEvent) {
		if (scale <= 1) return;
		isPanning = true;
		panStartX = e.clientX;
		panStartY = e.clientY;
		panStartPanX = panX;
		panStartPanY = panY;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isPanning) return;
		panX = panStartPanX + (e.clientX - panStartX);
		panY = panStartPanY + (e.clientY - panStartY);
	}

	function handleMouseUp() {
		isPanning = false;
	}

	function zoomIn() {
		setScale(scale + 0.5);
	}

	function zoomOut() {
		setScale(scale - 0.5);
	}

	function zoomFit() {
		scale = 1;
		panX = 0;
		panY = 0;
	}

	function copyPath() {
		navigator.clipboard?.writeText(assetUrl);
	}
</script>

<div class="iv-wrap" role="presentation" onmouseup={handleMouseUp} onmouseleave={handleMouseUp}>
	<div
		class="iv-canvas"
		class:panning={isPanning}
		role="button"
		tabindex="0"
		onwheel={handleWheel}
		ondblclick={handleDoubleClick}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoomFit(); } }}
	>
		<img
			src={assetUrl}
			alt={slug}
			class="iv-image"
			style="transform: scale({scale}) translate({panX}px, {panY}px)"
			draggable={false}
		/>
	</div>
	<div class="iv-info">
		<div class="iv-info-row">
			<FileImage size={14} />
			<span class="iv-filename">{slug}</span>
		</div>
		<div class="iv-info-row" class:empty={!naturalWidth}>
			<span class="iv-label">Dimensions</span>
			<span class="iv-value">{naturalWidth}&times;{naturalHeight} px</span>
		</div>
		<div class="iv-info-row" class:empty={!fileSize}>
			<span class="iv-label">Poids</span>
			<span class="iv-value">{fileSize || '—'}</span>
		</div>
		<div class="iv-info-row">
			<span class="iv-label">Zoom</span>
			<span class="iv-value">{zoomPercent}%</span>
		</div>
		<div class="iv-actions">
			<button class="iv-btn" onclick={zoomOut} title="Zoom arrière" disabled={scale <= 1}>
				<ZoomOut size={14} />
			</button>
			<button class="iv-btn" onclick={zoomFit} title="Ajuster">
				<Maximize2 size={14} />
			</button>
			<button class="iv-btn" onclick={zoomIn} title="Zoom avant" disabled={scale >= MAX_SCALE}>
				<ZoomIn size={14} />
			</button>
			<a href={assetUrl} target="_blank" class="iv-btn" title="Ouvrir dans un nouvel onglet">
				<ExternalLink size={14} /> Ouvrir
			</a>
			<a href={assetUrl} download class="iv-btn" title="Télécharger">
				<Download size={14} /> Télécharger
			</a>
			<button class="iv-btn" onclick={copyPath} title="Copier le chemin">
				<Copy size={14} /> Copier le chemin
			</button>
		</div>
	</div>
</div>

<style>
	.iv-wrap {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.iv-canvas {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		padding: 24px;
		background: repeating-conic-gradient(var(--c-bg-muted) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px;
		cursor: grab;
		user-select: none;
	}

	.iv-canvas.panning {
		cursor: grabbing;
	}

	.iv-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		transition: transform 0.15s ease;
		pointer-events: none;
	}

	.iv-info {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px 16px;
		border-top: 1px solid var(--c-border);
		background: var(--c-bg-subtle);
		font-size: 12px;
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	.iv-info-row {
		display: flex;
		align-items: center;
		gap: 5px;
		color: var(--c-text);
	}

	.iv-info-row.empty {
		opacity: 0.5;
	}

	.iv-filename {
		font-weight: 500;
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.iv-label {
		color: var(--c-text-muted);
	}

	.iv-value {
		font-family: var(--font-mono, monospace);
		color: var(--c-text);
	}

	.iv-actions {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-left: auto;
	}

	.iv-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--c-border);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.1s;
		white-space: nowrap;
	}

	.iv-btn:hover {
		background: var(--c-bg-muted);
		border-color: var(--c-border);
	}

	.iv-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
