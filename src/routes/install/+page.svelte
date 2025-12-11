<script lang="ts">
	import { onMount } from 'svelte';

	// Redirect to the new easy install page
	onMount(() => {
		window.location.href = '/install-easy';
	});
</script>

<svelte:head>
	<title>Redirecting to Easy Install...</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl space-y-6 text-center">
	<div class="text-6xl">👻</div>
	<h1 class="h1">Redirecting to Easy Install...</h1>
	<p>
		If you are not redirected automatically, <a href="/install-easy" class="anchor">click here</a>.
	</p>
</div>
