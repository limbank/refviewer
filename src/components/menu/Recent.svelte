<script>
	import { createEventDispatcher } from 'svelte';
	const { ipcRenderer } = require('electron');

	const dispatch = createEventDispatcher();

	export let recents;
</script>

<ul class="recents-list">
	{#if recents && recents.length}
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
	{:else}
		<span class="recents-list-fallback">
			No recent files found yet!
		</span>
	{/if}
</ul>

<style lang="scss">
	.recents-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;

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
	}
</style>
