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

{#await fetchChangelog}
	<Loader color="#B7B9BC" />
{:then data}
	<div class="changelog-wrapper">
		<SvelteMarkdown source={data.body} />
	</div>
{:catch error}
	<div class="changelog-wrapper">
		<p>Failed to fetch the changelog... Maybe there is no changelog for v{version}?</p>
	</div>
{/await}

<style lang="scss">
	.changelog-wrapper {
		height: auto;
		font-size: 14px;
		color: #B7B9BC;
		padding: 5px 0;
		box-sizing: border-box;

		:global(p) {
			margin: 0 0 10px;
		}

		:global(a) {
			color: #B7B9BC;
			font-weight: 600;

			&:hover {
				color: #FAA916;
			}
		}

		:global(code) {
			padding: 2px 4px;
			margin: 0;
			font-size: 85%;
			background-color: #2F2E33;
			border-radius: 3px;
		}
	}
</style>
