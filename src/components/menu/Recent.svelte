<script>
	import { createEventDispatcher, onMount } from 'svelte';
	const { ipcRenderer } = require('electron');
	import Loader from '../common/Loader.svelte';

	const dispatch = createEventDispatcher();

	let recents;

    let resetConfirmed = false;
    let resetText = "Clear";

    function handleReset() {
    	if (!resetConfirmed) {
    		resetText = "Are you sure?";
    		resetConfirmed = true;
    		return;
    	}

    	ipcRenderer.send('clearRecents');

    	resetConfirmed = false;
    	resetText = "Clear";
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
				    	on:click={(e) => {
				    		e.preventDefault();
				    		ipcRenderer.send('file', item);
							ipcRenderer.send('loading', true);
				    		dispatch('settingsOpen', false);
				    	}}
					>{item}</a>
				</li>
			{/each}

			<li class="list-button">
				<button on:click={handleReset}>{resetText}</button>
			</li>
		{:else}
			<span class="recents-list-fallback">
				No recent files found yet!
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
			background: #2F2E33;
			border-radius: 3px;
			padding: 6px 10px;
			margin-bottom: 6px;
			text-decoration: none;
			color: #B7B9BC;
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
			color: #B7B9BC;
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
				background-color: #2F2E33;
				cursor: pointer;
				border: 0;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				padding: 5px 10px;
			    color: #B7B9BC;
			    font-size: 12px;
			    font-weight: 600;

			    &:hover {
		  			background-color: #FAA916;
		  			color: #171719;
			    }
			}
		}
	}
</style>
