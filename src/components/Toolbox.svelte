<script>
	import { createEventDispatcher } from 'svelte';
	const { ipcRenderer } = require('electron');
	import Tool from './Tool.svelte';

	const dispatch = createEventDispatcher();

	export let fileSelected = false;
	export let settingsOpen = false;
	export let legacy = false;
	export let tips = false;

	function copyImage() {
		var xhr = new XMLHttpRequest();
		xhr.onload = () => {
			try{
				var response =  xhr.response.slice(0,  xhr.response.size, "image/png");
				const item = new ClipboardItem({ "image/png": response });
				navigator.clipboard.write([item]);
				this.notify("Image copied!");
			}
			catch(e){ console.log(e); }
		};
		xhr.open('GET', fileSelected);
		xhr.responseType = 'blob';
		xhr.send();

		//NOTIFY THE USER!!
	}
</script>

<div class="toolbox">
	{#if fileSelected && !settingsOpen}
		<Tool
			tips={tips}
			legacy={legacy}
			size="13px"
			tiptext={"Save image"}
			on:click={e => { ipcRenderer.send('saveImage', fileSelected); }}
		>
			<i class="far fa-save"></i>
		</Tool>
		<Tool
			tips={tips}
			size="13px"
			legacy={legacy}
			tiptext={"Copy image"}
			on:click={copyImage}
		>
	    	<i class="far fa-clipboard" style="transform: translateY(-2px);"></i>
		</Tool>
		<Tool
			tips={tips}
			size="12px"
			legacy={legacy}
			tiptext={"Pick a color"}
			on:click={e => { dispatch('pickColor'); }}
		>
	    	<i class="fas fa-eye-dropper"></i>
		</Tool>
		<!--
		<button class="control control-">
	    	<i class="fas fa-sync-alt"></i>
		</button>
		<button class="control control-">
	    	<i class="fas fa-redo"></i>
		</button>
		<button class="control control-">
	    	<i class="fas fa-fill"></i>
		</button>
		<button class="control control-">
	    	<i class="fas fa-palette"></i>
		</button>-->
	{/if}
</div>

<style lang="scss">
	.toolbox {
		width: 35px;
		min-width: 35px;
		flex-shrink: 0;
		box-sizing: border-box;
		margin-top: -1px;
	}
</style>
