<script>
	import { onMount } from 'svelte';
	const { ipcRenderer } = require('electron');
	import Loader from '../common/Loader.svelte';

	import { tt, locale, locales } from "../../stores/i18n.js";
	import settingsOpen from '../../stores/settingsOpen.js';

	let recents;

    let resetConfirmed = false;
    let resetText = $tt("recent.reset");

    function handleReset() {
    	if (!resetConfirmed) {
    		resetText = $tt("settings.confirm");
    		resetConfirmed = true;
    		return;
    	}

    	ipcRenderer.send('clearRecents');

    	resetConfirmed = false;
    	resetText = $tt("recent.reset");
    }

	ipcRenderer.on('recents', (event, arg) => {
		recents = arg;
	});

	onMount(async () => {
		ipcRenderer.send('getRecents');
	});
</script>

<ul class="recents-list">
	{#if recents}
		{#if recents.length}
			{#each recents as item}
				<li>
					<a
						class="recents-list-item"
						href="{item}"
				    	on:click|preventDefault={() => {
				    		ipcRenderer.send('file', item);
							ipcRenderer.send('loading', true);
							$settingsOpen = false;
				    	}}
					>{item}</a>
				</li>
			{/each}

			<li class="list-button">
				<button on:click={handleReset}>{resetText}</button>
			</li>
		{:else}
			<span class="recents-list-fallback">
				{$tt("recent.notfound")}
			</span>
		{/if}
	{:else}
		<Loader color="#B7B9BC" />
	{/if}
</ul>

<style lang="scss">
	.recents-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
		height: 100%;

		li, a {
			width: 100%;
		}

		li {
			align-items: center;
			display: inline-flex;
		}

		&-item {
			background: var(--secondary-bg-color);
			border-radius: 3px;
			padding: 6px 10px;
			margin-bottom: 6px;
			text-decoration: none;
			color: var(--main-txt-color);
			font-size: 12px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			box-sizing: border-box;
			display: block;
		}

		&-fallback {
			display: inline-flex;
			width: 100%;
			text-align: center;
			color: var(--main-txt-color);
			font-size: 12px;
			padding: 15px;
			justify-content: center;
			box-sizing: border-box;
		}

		.list-button {
			justify-content: center;
			padding: 5px 0 10px;

			button {
				min-height: 25px;
				border-radius: 3px;
				background-color: var(--secondary-bg-color);
				cursor: pointer;
				border: 0;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				padding: 5px 10px;
			    color: var(--main-txt-color);
			    font-size: 12px;
			    font-weight: 600;

			    &:hover {
		  			background-color: var(--main-accent-color);
		  			color: #171719;
			    }
			}
		}
	}
</style>
