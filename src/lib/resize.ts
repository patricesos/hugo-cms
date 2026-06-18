let cleanupFns: (() => void)[] = [];

function createResizeHandler(
	getStartWidth: () => number,
	setWidth: (w: number) => void,
	clamp: (w: number) => number,
	reverse?: boolean,
) {
	return (e: MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = getStartWidth();
		function onMove(ev: MouseEvent) {
			const delta = reverse ? -(ev.clientX - startX) : ev.clientX - startX;
			setWidth(clamp(startWidth + delta));
		}
		function onUp() {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}
		const cleanup = () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
		cleanupFns.push(cleanup);
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	};
}

export function startSidebarResize(getWidth: () => number, setWidth: (w: number) => void) {
	return createResizeHandler(getWidth, setWidth, w => Math.max(180, Math.min(500, w)));
}

export function startFmResize(getWidth: () => number, setWidth: (w: number) => void) {
	return createResizeHandler(getWidth, setWidth, w => Math.max(200, Math.min(500, w)), true);
}

export function startPreviewResize(getWidth: () => number, setWidth: (w: number) => void) {
	return (e: PointerEvent) => {
		e.preventDefault();
		const handle = e.currentTarget as HTMLElement;
		const startX = e.clientX;
		const startWidth = getWidth();
		handle.setPointerCapture(e.pointerId);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
		function onMove(ev: PointerEvent) {
			setWidth(Math.max(320, Math.min(1024, startWidth - (ev.clientX - startX))));
		}
		function onUp() {
			handle.removeEventListener('pointermove', onMove);
			handle.removeEventListener('pointerup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}
		handle.addEventListener('pointermove', onMove);
		handle.addEventListener('pointerup', onUp);
	};
}

export function cleanupAllResize() {
	for (const fn of cleanupFns) fn();
	cleanupFns = [];
}
