<script>
	import { createEventDispatcher } from 'svelte';
	import Settings from './Settings.svelte';
	import About from './About.svelte';
	import Recent from './Recent.svelte';
	import Changelog from './Changelog.svelte';

	const dispatch = createEventDispatcher();

	let setWindow = "recent";

	export let settings;
	export let recents;
	export let version;
</script>

<div class="settings-container">
	<div class="settings-container-sidebar">
		<ul class="settings-container-menu">
			<li
				class:active={setWindow=="recent"}
				on:click={e => { setWindow="recent"; }}
			>
				Recent
			</li>
			<li
				class:active={setWindow=="settings"}
				on:click={e => { setWindow="settings"; }}
			>
				Settings
			</li>
			<li
				class:active={setWindow=="about"}
				on:click={e => { setWindow="about"; }}
			>
				About
			</li>
			<li
				class:active={setWindow=="changelog"}
				on:click={e => { setWindow="changelog"; }}
			>
				Changelog
			</li>
		</ul>
	</div>
	<div class="settings-container-main">
		{#if setWindow=="recent"}
			<div class="settings-w-inner">
				<Recent
					{recents}
					on:settingsOpen={e => { dispatch('settingsOpen', e.detail); }}
				/>
			</div>
		{:else if setWindow=="settings"}
			<div class="settings-w-inner">
				<Settings {settings} />
			</div>
		{:else if setWindow=="about"}
			<div class="settings-w-inner">
				<About {version} />
			</div>
		{:else if setWindow=="changelog"}
			<div class="settings-w-inner">
				<Changelog />
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.settings-container {
		position: absolute;
		z-index: 2;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: #2F2E33;
		display: flex;

		&-sidebar {
			flex-shrink: 0;
			width: 150px;
		}

		&-main {
			flex-grow: 1;
			background: #3A3940;
			overflow-y: auto;
		}

		&-menu {
			padding: 8px;
			margin: 0;
			list-style: none;
			display: flex;
			flex-direction: column;

			li {
				display: inline-flex;
				font-weight: 500;
				color: #B7B9BC;
				padding: 5px 8px;
				font-size: 14px;
				margin-bottom: 2px;
				border-radius: 5px;
				cursor: pointer;
				user-select: none;

				&.active {
					background: #3A3940;
				}

				&:hover {
					background: #3A3940;
				}
			}
		}
	}

	.settings-w-inner {
		padding: 8px 14px;
	}
</style>
