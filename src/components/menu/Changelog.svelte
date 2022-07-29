<script>
	import SvelteMarkdown from 'svelte-markdown';
	import Loader from '../common/Loader.svelte';
	const { version } = require('../package.json');

	const fetchChangelog = (async () => {
		const response = await fetch('https://api.github.com/repos/starbrat/refviewer/releases/tags/v' + version);

    	if (response.status === 200) return await response.json();
	    else throw new Error(response.statusText);
	})();
</script>

<div class="changelog-wrapper">
	{#await fetchChangelog}
		<Loader color="#B7B9BC" />
	{:then data}
		<SvelteMarkdown source={data.body} />
	{:catch error}
		<p>Failed to fetch the changelog... Maybe there is no changelog for v{version}?</p>
	{/await}
</div>

<style lang="scss">
	.changelog-wrapper {
		height: 100%;
		font-size: 14px;
		color: #B7B9BC;
		padding: 5px 0;
		box-sizing: border-box;

		:global(p) {
			margin: 0 0 10px;
		}

		:global(a) {
			color: #B7B9BC;
		}
	}
</style>
