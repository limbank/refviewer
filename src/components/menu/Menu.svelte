<script>
	import Settings from './Settings.svelte';
	import About from './About.svelte';
	import Recent from './Recent.svelte';

	import { tt, locale, locales } from "../../stores/i18n.js";

	let setWindow = "recent";

	export let version;

	const fetchLatest = (async () => {
		const response = await fetch('https://api.github.com/repos/starbrat/refviewer/releases');

    	if (response.status === 200) return await response.json();
	    else throw new Error(response.statusText);
	})();
</script>

<div class="settings-container">
	<div class="settings-container-sidebar">
		<ul class="settings-container-menu">
			<li
				class:active={setWindow=="recent"}
				on:click={e => { setWindow="recent"; }}
			>
				{$tt("menu.recent")}
			</li>
			<li
				class:active={setWindow=="settings"}
				on:click={e => { setWindow="settings"; }}
			>
				{$tt("menu.settings")}
			</li>
			<li
				class:active={setWindow=="about"}
				on:click={e => { setWindow="about"; }}
			>
				{$tt("menu.about")}
			</li>
			{#await fetchLatest then data}
				{#if data[0] && data[0].tag_name != 'v' + version}
					<li
						on:click={e => {
							window.location.href = data[0].html_url;
						}}
					>
						{$tt("menu.update")}
					</li>

				{/if}
			{:catch error}
				{ console.log(error) || '' }
			{/await}
		</ul>
	</div>
	<div class="settings-container-main">
		{#if setWindow=="recent"}
			<div class="settings-w-inner">
				<Recent />
			</div>
		{:else if setWindow=="settings"}
			<div class="settings-w-inner">
				<Settings />
			</div>
		{:else if setWindow=="about"}
			<div class="settings-w-inner">
				<About {version} />
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.settings-container {
		position: absolute;
		z-index: 3;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: var(--secondary-bg-color);
		display: flex;

		&-sidebar {
			flex-shrink: 0;
			width: 150px;
			background: var(--secondary-bg-color);
		}

		&-main {
			flex-grow: 1;
			background: var(--main-fg-color);
			overflow-y: auto;
		}

		&-menu {
			padding: 8px;
			box-sizing: border-box;
			margin: 0;
			list-style: none;
			display: flex;
			flex-direction: column;

			li {
				display: inline-flex;
				font-weight: 500;
				color: var(--main-txt-color);
				padding: 5px 8px;
				font-size: 14px;
				margin-bottom: 2px;
				border-radius: 5px;
				cursor: pointer;
				user-select: none;

				&.active {
					background: var(--main-fg-color);
				}

				&:hover {
					background: var(--main-fg-color);
				}
			}
		}
	}

	.settings-w-inner {
		padding: 8px 14px;
		box-sizing: border-box;
		height: 100%;
	}
</style>
