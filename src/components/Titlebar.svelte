<script>
	import { createEventDispatcher } from 'svelte';

	const { ipcRenderer } = require('electron');

	const dispatch = createEventDispatcher();

	export let fileSelected = false;
	export let settingsOpen = false;
	let pinned = false;

	ipcRenderer.on('pin', (event, arg) => {
  		pinned = arg;
	});
</script>

<div class="titlebar">
	<div class="titlebar-group">
		<button class="control control-menu" on:click={e => {
			settingsOpen = !settingsOpen;
			dispatch('settingsOpen', settingsOpen);
		}}>
			{#if settingsOpen}
    			<i class="fas fa-times"></i>
			{:else}
    			<i class="fas fa-bars"></i>
			{/if}
		</button>
		{#if !settingsOpen}
			<!--
			<button class="control control-screenshot">
		    	<i class="fas fa-crosshairs"></i>
			</button>
			-->
			{#if fileSelected}
				<button class="control control-clear" on:click={e => { dispatch('clear'); }}>
			    	<i class="fas fa-trash"></i>
				</button>
			{/if}
		{/if}
	</div>
	<div class="titlebar-group">
		<span class="version">v. 4.0.6</span>
		<button class="control control-pin" class:pinned on:click={e => { ipcRenderer.send('window', 'pin'); }}>
	    	<i class="fas fa-thumbtack"></i>
		</button>
		<button class="control control-minimize" on:click={e => { ipcRenderer.send('window', 'minimize'); }}>
	    	<i class="fas fa-minus"></i>
		</button>
		<button class="control control-restore" on:click={e => { ipcRenderer.send('window', 'maximize'); }}>
	    	<i class="fas fa-plus"></i>
		</button>
		<button class="control control-close" on:click={e => { ipcRenderer.send('window', 'close'); }}>
	    	<i class="fas fa-times"></i>
		</button>
	</div>
</div>

<style lang="scss">
	.titlebar {
		position: absolute;
		z-index: 9;
		top: 0;
		right: 0;
		left: 0;
		height: 30px;
		display: flex;
		justify-content: space-between;
	   	user-select: none;
	   	-webkit-user-select: none;
   		-webkit-app-region: drag;
   		padding: 5px;

   		&-group {
   			display: flex;
			justify-content: flex-end;
   		}

   		.version {
   			color: #2F2E33;
   			font-size: 10px;
   			font-weight: bold;
   			margin-right: 2px;
   			display: inline-flex;
   			align-items: center;
   			justify-content: center;
			height: 20px;
			pointer-events: none;
   		}
	}

	.control {
		box-sizing: border-box;
		color: #171719;
		background: #3A3940;
		border-radius: 3px;
		border: 0;
		margin: 0;
		padding: 2px 0 0;
		height: 20px;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		width: 30px;
		transition: color 0.1s ease-out;
		-webkit-app-region: no-drag;
		margin-left: 5px;
		font-size: 14px;

		&:first-child {
			margin-left: 0px;
		}

		&:last-child {
			margin-right: 0px;
		}

		&-menu,
		&-screenshot,
		&-clear {
			font-size: 12px;
		}

		&:hover {
			background: #FAA916;
		}

		&-pin {
			font-size: 13px;

			&.pinned {
				i {
					transform: rotate(-45deg);
				}
			}
		}
	}
</style>