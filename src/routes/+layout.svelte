<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Hugo Local CMS</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="preload" href="/fonts/OpenSans-Regular.ttf" as="font" type="font/ttf" crossorigin />
	<link rel="preload" href="/fonts/OpenSans-SemiBold.ttf" as="font" type="font/ttf" crossorigin />
	<link rel="preload" href="/fonts/OpenSans-Medium.ttf" as="font" type="font/ttf" crossorigin />
</svelte:head>

{@render children()}
