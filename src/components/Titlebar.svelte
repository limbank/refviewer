<script>
	import { createEventDispatcher } from 'svelte';
	import Control from './common/Control.svelte';

	const { ipcRenderer } = require('electron');

	const dispatch = createEventDispatcher();

	export let fileSelected = false;
	export let settingsOpen = false;
	export let legacy = false;
	export let tips = false;
	export let overwrite = false;
	export let version;
	let pinned = false;

	ipcRenderer.on('pin', (event, arg) => { pinned = arg; });
</script>

<div class="titlebar" class:legacy>
	<div class="titlebar-group">
		<Control
			{tips}
			{legacy}
			size="12px"
			tiptext={settingsOpen ? "Close menu" : "Main menu"}
			on:click={e => {
				settingsOpen = !settingsOpen;
				dispatch('settingsOpen', settingsOpen);
			}}
		>
			{#if settingsOpen}
    			<i class="fas fa-times"></i>
			{:else}
    			<i class="fas fa-bars"></i>
			{/if}
		</Control>

		{#if !settingsOpen}
			{#if !fileSelected || overwrite}
				<Control
					{tips}
					{legacy}
					size="12px"
					tiptext="Select file"
					on:click={e => { ipcRenderer.send('selectfile'); }}
				>
					<i class="fas fa-file-upload"></i>
				</Control>

				<Control
					{tips}
					{legacy}
					size="12px"
					tiptext="Screenshot"
					on:click={e => { ipcRenderer.send('screenshot'); }}
				>
			    	<i class="fas fa-crosshairs"></i>
				</Control>
			{/if}
			{#if fileSelected}
				<Control
					{tips}
					{legacy}
					size="12px"
					tiptext="Clear"
					on:click={e => { dispatch('clear'); }}
				>
			    	<i class="fas fa-trash"></i>
				</Control>
			{/if}
		{/if}
	</div>
	<div class="titlebar-group">
		{#if version}
			<span class="version">v. {version}</span>
		{/if}
		<Control
			{tips}
			{legacy}
			size="12px"
			tiptext="New window"
			 on:click={e => { ipcRenderer.send('window', 'new'); }}
		>
	    	<i class="fas fa-window"></i>
		</Control>
		<Control
			{tips}
			{legacy}
			size="13px"
			tiptext="Pin to top"
			 on:click={e => { ipcRenderer.send('window', 'pin'); }}
		>
	    	<i class="fas fa-thumbtack" class:pinned></i>
		</Control>
		<Control
			{tips}
			{legacy}
			tiptext="Minimize"
			on:click={e => { ipcRenderer.send('window', 'minimize'); }}
		>
	    	<i class="fas fa-minus"></i>
		</Control>
		<Control
			{tips}
			{legacy}
			tiptext="Maximize"
			on:click={e => { ipcRenderer.send('window', 'maximize'); }}
		>
			<i class="fas fa-plus"></i>
		</Control>
		<Control
			{tips}
			{legacy}
			persistent={true}
			tiptext="Close"
			on:click={e => { ipcRenderer.send('window', 'close'); }}
		>
	    	<i class="fas fa-times"></i>
		</Control>
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
		box-sizing: border-box;

   		&.legacy {
   			border-bottom: 2px solid #3F3F3F;
   			padding: 0 10px 10px;
   			height: 35px;
   		}

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

	i.pinned {
		transform: rotate(-45deg);
	}
</style>