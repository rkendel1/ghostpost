<script lang="ts">
	import { onMount } from 'svelte';
	
	// Redirect to the appropriate install page based on device
	onMount(() => {
		const ua = navigator.userAgent.toLowerCase();
		const isIOS = /iphone|ipad|ipod/.test(ua);
		
		if (isIOS) {
			window.location.href = '/install/iphone';
		} else {
			window.location.href = '/install-easy';
		}
	});
</script>

<svelte:head>
	<title>Redirecting to Install Page...</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl space-y-6 text-center">
	<div class="text-6xl">👻</div>
	<h1 class="h1">Redirecting to Install Page...</h1>
	<p>Detecting your device and redirecting to the best installation guide...</p>
	<p class="text-sm opacity-70">
		If you are not redirected automatically:
		<a href="/install-easy" class="anchor">Desktop Install</a> | 
		<a href="/install/iphone" class="anchor">iPhone Install</a>
	</p>
</div>
