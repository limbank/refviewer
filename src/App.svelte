<script>
	import Titlebar from './components/Titlebar.svelte';
	import Desktop from './components/Desktop.svelte';
	import Toolbox from './components/Toolbox.svelte';
	import Settings from './components/Settings.svelte';

	import { Canvas, Layer, t } from "svelte-canvas";
	import Dropzone from "svelte-file-dropzone";

	const { ipcRenderer } = require('electron');

	let file = false;
	let width;
	let height;
	let zoomed = false;
	let settings = false;

	let img = new Image(); 

  	$: render = ({ context }) => {
	    context.drawImage(img, 0, 0);

	    // just grab a DOM element
		var element = document.querySelector('.canvas-container');

		// And pass it to panzoom
		var instance = panzoom(element);
		instance.on('zoom', function(e) {
			let data = instance.getTransform();
			if (data.scale >= 10) zoomed = true;
			else zoomed = false;
		});
  	};

	function handleFilesSelect(e) {
	    const { acceptedFiles } = e.detail;

	    ipcRenderer.send('file', acceptedFiles[0].path);
	}

	img.onload = function(){
	  	width = img.width;
	  	height = img.height;
	};

	ipcRenderer.on('deliver', (event, arg) => {
		console.log("loading file!");
		img.src = arg;
		file = arg;
	});

	/*
		NOTE!!!
		Currently the drop zone gets hidden when the image
		is shown, add overwriting on repeated drop into
		the settings later.

		Maybe add a setting that separates clicking
		into a separate button.

		Also enable copy paste.
	*/
</script>

<div class="backdrop">
	<div class="backdrop-bg backdrop-top"></div>
	<div class="backdrop-bg backdrop-right"></div>
	<div class="backdrop-bg backdrop-bottom"></div>
	<div class="backdrop-bg backdrop-left"></div>
</div>
<main>
	<Titlebar
		fileSelected={file}
		settings={settings}
		on:clear={e => { file = false; }}
		on:settings={e => { settings = e.detail; }}
	/>
	<Toolbox
		fileSelected={file}
	/>
	<Desktop>
		{#if settings}
			<Settings />
		{/if}
		
		{#if file}
			<div class="canvas-container" class:pixelated={zoomed}>
			    <Canvas width={width} height={height}>
					<Layer {render} />
				</Canvas>
			</div>
		{:else}
			<Dropzone 
				on:drop={handleFilesSelect} 
				disableDefaultStyles="true"
				multiple="false"
				containerClasses="drop"
				containerStyles="flex-grow:1;"
			>
				<div class="dropzone-inner-wrapper">
					<div class="dropzone-inner">
						<div class="dropzone-inner-icon">
							<i class="fas fa-upload"></i>
						</div>
						<div class="dropzone-inner-text">
							Drag a file or<br>click to select
						</div>
					</div>
				</div>
			</Dropzone>
		{/if}
	</Desktop>
</main>

<style lang="scss">
	.backdrop {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 1;
		border-radius: 5px;
		overflow: hidden;
		pointer-events: none;

		&-bg {
			background: #171719;
			position: absolute;
		}

		&-top {
			left: 0;
			top: 0;
			right: 0;
			height: 42px;
		}

		&-bottom {
			left: 0;
			bottom: 0;
			right: 0;
			height: 17px;
		}

		&-left {
			left: 0;
			top: 0;
			bottom: 0;
			width: 52px;
		}

		&-right {
			right: 0;
			top: 0;
			bottom: 0;
			width: 17px;
		}
	}

	main {
		position: fixed;
		z-index: 2;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		border-radius: 5px;
		overflow: hidden;
		display: flex;
		padding: 30px 5px 5px;
	}

	.canvas-container {
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
		width: 100%;
		height: 100%;

		:global(canvas) {
		    max-width: 100%;
		    max-height: 100%;
		    object-fit: contain;
		    align-self: center;
		    z-index:9999 !important;
		    pointer-events:all !important;
		}
	}

	.pixelated {
		:global(canvas) {
		    image-rendering: -webkit-crisp-edges;
		    image-rendering: pixelated;
		    image-rendering: crisp-edges;
		}
	}

	.dropzone-inner-wrapper {
		padding: 10px;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		box-sizing: border-box;
	}

	.dropzone-inner {
		cursor: pointer;
		border:2px dashed #3A3940;
		box-sizing: border-box;
		border-radius: 3px;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		color: #3A3940;

		&-icon {
			font-size: 35px;
			margin-bottom: 10px;
		}

		&-text {
			font-size: 18px;
			font-weight: bold;
			text-align: center;
		}
	}
</style>
