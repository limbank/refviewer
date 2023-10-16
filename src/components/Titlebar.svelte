<script>
	import { createEventDispatcher } from 'svelte';
	import mousetrap from 'svelte-use-mousetrap';
	import Button from './common/Button.svelte';

	const { ipcRenderer } = require('electron');

	const dispatch = createEventDispatcher();

	export let fileSelected = false;
	export let settingsOpen = false;
	export let legacy = false;
	export let tips = false;
	export let devmode = false;
	export let overwrite = false;
	export let version;
	let pinned = false;
	let maximized = false;

	ipcRenderer.on('pin', (event, arg) => { pinned = arg; });
	ipcRenderer.on('max', (event, arg) => { maximized = arg; });

	function openImage() {
		ipcRenderer.send('selectfile');
	}

	function clearImage() {
		dispatch('clear');
	}

	function cutImage() {
		dispatch('copy');
		dispatch('clear');
	}

	function openDevTools() {
		ipcRenderer.send('window', 'devtools');
	}

	function openNewWindow() {
		ipcRenderer.send('window', 'new');
	}

	function maximize() {
		ipcRenderer.send('window', 'maximize');
	}
</script>

<svelte:window use:mousetrap={[
  ['command+o', 'ctrl+o', openImage],
  ['del', 'backspace', clearImage],
  ['command+x', 'ctrl+x', cutImage],
  ['command+n', 'ctrl+n', openNewWindow],
  ['f11', maximize],
  ['shift+ctrl+i', 'shift+command+i', openDevTools]
]} />

<div class="titlebar" class:legacy>
	<div class="titlebar-group">
		<Button
			{tips}
			{legacy}
			context="control"
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
		</Button>

		{#if !settingsOpen}
			{#if !fileSelected || overwrite}
				<Button
					{tips}
					{legacy}
					context="control"
					size="12px"
					tiptext="Select file"
					on:click={openImage}
				>
					<i class="fas fa-file-upload"></i>
				</Button>

				<Button
					{tips}
					{legacy}
					context="control"
					size="12px"
					tiptext="Screenshot"
					on:click={e => { ipcRenderer.send('screenshot'); }}
				>
			    	<i class="fas fa-crosshairs"></i>
				</Button>
			{/if}
			{#if fileSelected}
				<Button
					{tips}
					{legacy}
					context="control"
					size="12px"
					tiptext="Clear"
					on:click={clearImage}
				>
			    	<i class="fas fa-trash"></i>
				</Button>
			{/if}
		{/if}
	</div>
	<div class="titlebar-group">
		{#if version}
			<span class="version">v. {version}</span>
		{/if}
		{#if devmode}
			<Button
				{tips}
				{legacy}
				context="control"
				size="12px"
				tiptext="Make click-through"
				 on:click={openDevTools}
			>
		    	<i class="fas fa-terminal"></i>
			</Button>
		{/if}
		<Button
			{tips}
			{legacy}
			context="control"
			size="12px"
			tiptext="Make click-through"
			 on:click={e => { ipcRenderer.send('window', 'clickthrough'); }}
		>
	    	<i class="fas fa-ghost"></i>
		</Button>
		<Button
			{tips}
			{legacy}
			context="control"
			size="12px"
			tiptext="New window"
			 on:click={openNewWindow}
		>
	    	<i class="fas fa-window"></i>
		</Button>
		<Button
			{tips}
			{legacy}
			context="control"
			size="13px"
			tiptext="Pin to top"
			 on:click={e => { ipcRenderer.send('window', 'pin'); }}
		>
	    	<i class="fas fa-thumbtack" class:pinned></i>
		</Button>
		<Button
			{tips}
			{legacy}
			context="control"
			tiptext="Minimize"
			on:click={e => { ipcRenderer.send('window', 'minimize'); }}
		>
	    	<i class="fas fa-minus"></i>
		</Button>
		<Button
			{tips}
			{legacy}
			context="control"
			tiptext={maximized ? "Restore" : "Maximize"}
			on:click={maximize}
		>
			<i class="fas fa-plus"></i>
		</Button>
		<Button
			{tips}
			{legacy}
			context="control"
			persistent={true}
			tiptext="Close"
			on:click={e => { ipcRenderer.send('window', 'close'); }}
		>
	    	<i class="fas fa-times"></i>
		</Button>
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