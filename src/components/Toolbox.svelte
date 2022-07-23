<script>
	import { createEventDispatcher } from 'svelte';
	const { ipcRenderer } = require('electron');

	import Tool from './Tool.svelte';
	import Eyedropper from './Eyedropper.svelte';
	import Backdrop from './Backdrop.svelte';
	import Palette from './Palette.svelte';

	const dispatch = createEventDispatcher();

	export let fileSelected = false;
	export let pickedColor;
	export let settingsOpen = false;
	export let legacy = false;
	export let tips = false;
	export let backdropColor = "#000000";

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
			size="13px"
			legacy={legacy}
			tips={tips}
			tiptext={"Copy image"}
			on:click={copyImage}
		>
	    	<i class="far fa-clipboard" style="transform: translateY(-2px);"></i>
		</Tool>
		<Eyedropper
			legacy={legacy}
			tips={tips}
			bind:pickedColor
			on:pickColor={() => dispatch("pickColor")}
		/>
		<Backdrop
			bind:backdropColor
			legacy={legacy}
			tips={tips}
		/>
		<Tool
			size="13px"
			legacy={legacy}
			tips={tips}
			tiptext={"Flip image"}
			on:click={e => { ipcRenderer.send('flipImage', fileSelected); }}
		>
	    	<i class="fas fa-sync-alt"></i>
		</Tool>
		<Tool
			size="12px"
			legacy={legacy}
			tips={tips}
			tiptext={"Rotate image"}
			on:click={e => { ipcRenderer.send('rotateImage', fileSelected); }}
		>
	    	<i class="fas fa-redo"></i>
		</Tool>
		<Palette
			bind:fileSelected
			legacy={legacy}
			tips={tips}
		/>
		<!--
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

	@media only screen and (max-width: 300px) {
		.toolbox {
			display: none;
		}
	}
</style>
