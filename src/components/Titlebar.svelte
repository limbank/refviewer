<script>
	import { createEventDispatcher } from 'svelte';
	import mousetrap from 'svelte-use-mousetrap';

	import { tt, locale, locales } from "../stores/i18n.js";
	import settings from '../stores/settings.js';
	import fileSelected from '../stores/fileSelected.js';
	import settingsOpen from '../stores/settingsOpen.js';

	import Button from './common/Button.svelte';

	const { ipcRenderer } = require('electron');

	const dispatch = createEventDispatcher();

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
  ['command+n', 'ctrl+n', openNewWindow],
  ['f11', maximize],
  ['shift+ctrl+i', 'shift+command+i', openDevTools]
]} />

<div class="titlebar">
	<div class="titlebar-group">
		<Button
			context="control"
			tiptext={$settingsOpen ? $tt("titlebar.closemenu") : $tt("titlebar.mainmenu")}
			on:click={e => {
				$settingsOpen = !$settingsOpen;
			}}
		>
			{#if $settingsOpen}
    		<i class="fas fa-times"></i>
			{:else}
    		<i class="fas fa-bars"></i>
			{/if}
		</Button>

		{#if !$settingsOpen}
			{#if !$fileSelected || $settings.overwrite}
				<Button
					context="control"
					tiptext={$tt("titlebar.selectfile")}
					on:click={openImage}
				>
					<i class="fas fa-file-upload"></i>
				</Button>

				<Button
					context="control"
					tiptext={$tt("titlebar.screenshot")}
					on:click={e => { ipcRenderer.send('screenshot'); }}
				>
			    	<i class="fas fa-crosshairs"></i>
				</Button>
			{/if}
			{#if $fileSelected}
				<Button
					context="control"
					tiptext={$tt("titlebar.clear")}
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
		{#if $settings.devmode}
			<Button
				context="control"
				tiptext={$tt("titlebar.devtools")}
				 on:click={openDevTools}
			>
		    	<i class="fas fa-terminal"></i>
			</Button>
		{/if}
		<Button
			context="control"
			tiptext={$tt("titlebar.clickthrough")}
			 on:click={e => { ipcRenderer.send('window', 'clickthrough'); }}
		>
	    	<i class="fas fa-ghost"></i>
		</Button>
		<Button
			context="control"
			tiptext={$tt("titlebar.newwindow")}
			 on:click={openNewWindow}
		>
	    	<i class="fas fa-window"></i>
		</Button>
		<Button
			context="control"
			tiptext={$tt("titlebar.pintotop")}
			 on:click={e => { ipcRenderer.send('window', 'pin'); }}
		>
	    	<i class="fas fa-thumbtack" class:pinned></i>
		</Button>
		<Button
			context="control"
			tiptext={$tt("titlebar.minimize")}
			on:click={e => { ipcRenderer.send('window', 'minimize'); }}
		>
	    	<i class="fas fa-minus"></i>
		</Button>
		<Button
			context="control"
			tiptext={maximized ? $tt("titlebar.restore") : $tt("titlebar.maximize")}
			on:click={maximize}
		>
			<i class="fas fa-plus"></i>
		</Button>
		<Button
			context="control"
			persistent={true}
			tiptext={$tt("titlebar.close")}
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

   		&-group {
   			display: flex;
			justify-content: flex-end;
   		}

   		.version {
   			color: var(--secondary-bg-color);
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