<script>
	import Titlebar from './components/Titlebar.svelte';
	import Desktop from './components/Desktop.svelte';
	import Backframe from './components/Backframe.svelte';
	import Toolbar from './components/Toolbar.svelte';
	import Actions from './components/Actions.svelte';
	import Dropfield from './components/Dropfield.svelte';
	import Menu from './components/menu/Menu.svelte';
	import Loader from './components/common/Loader.svelte';
	import Cursor from './components/Cursor.svelte';
	import Zoomscale from './components/Zoomscale.svelte';
	import Zoomslider from './components/Zoomslider.svelte';

	import tinycolor from 'tinycolor2';
	import Panzoom from '@panzoom/panzoom';
	import { Canvas, Layer, t } from "svelte-canvas";
	//import mousetrap from 'svelte-use-mousetrap';

	import Helper from './scripts/helper.js';
	import settings from './stores/settings.js';
	import backdrop from './stores/backdrop.js';

	const { ipcRenderer } = require('electron');
	const { version } = require('../package.json');

	const helper = new Helper();

	let fileSelected = false;
	let width;
	let height;
	let pixelated = false;
	let settingsOpen = false;
	let pickingMode = false;
	let croppingMode = false;
	let initUpdate = 0;
	let instance;
	let mainElement;

	let loading = false;

	let element;

	let hex;
	let chosenColor;
	let mouseincanvas = false;

	let zoomscale = 1;

	let tbx;

  	let workAreaOpacity = 1;
	let m = { x: 0, y: 0 };

	let showDropdown = false;

	let img = new Image();
	img.onload = function(){
	  	width = img.width;
	  	height = img.height;
	};

	ipcRenderer.on('loading', (event, arg) => {
		loading = arg;
	});

	ipcRenderer.on('argv', (event, arg) => {
		if (arg[1] && arg[1] != "." && arg[1] != "") {
			ipcRenderer.send('file', arg[1]);
		}
	});

	function getBackcolor() {
		return getComputedStyle(mainElement)
    		.getPropertyValue('--secondary-bg-color') || "#2F2E33";
	}

	let mainIDInterval;
	let cachedMainID;

	function changeMainBackdrop() {
		if (mainElement) {
			cachedMainID = mainElement.id;

			clearInterval(mainIDInterval);
			mainIDInterval = setInterval(() => {
				let newID = mainElement.id;
				if (newID != cachedMainID) {
					$backdrop = getBackcolor();
					clearInterval(mainIDInterval);
				}
			});
		}
	}

	$: if ($settings) {
		//console.log("got settings");

		if ($settings.zoom && instance) {
			element = document.querySelector('.canvas-container-inner');
			initPan($settings.zoom);
		}

		changeMainBackdrop();
	}

	$: if (mainElement) {
		changeMainBackdrop();
	}

	ipcRenderer.on('deliver', (event, arg) => {
		img.src = arg;
		loading = false;
		fileSelected = arg;
	});

	function handleCursor(event) {
		m.x = event.clientX;
		m.y = event.clientY;
	}

	function wheelEvent(event) {
	  	if (croppingMode) return;

	  	instance.zoomWithWheel(event)
	}

	function changeEvent(event) {
		zoomscale = Number(event.detail.scale).toFixed(1);

	  	if (event.detail.scale >= 10) pixelated = true;
		else pixelated = false;
	}

	function delInstance() {
	    try {
	    	instance.destroy();
	    	console.log("Removing listeners");
			element.parentElement.removeEventListener('wheel', wheelEvent);
			element.removeEventListener('panzoomchange', changeEvent);
	    }
	    catch(e) {/*console.log("errrrr", e);*/}
	}

	function initPan(customZoom = false) {
		if (!element) return;

		delInstance();

		if (croppingMode) return;
		//make sure picking mode can't pan after

		// And pass it to panzoom
		instance = Panzoom(element, {
			maxScale: 10000,
			step: customZoom || $settings.zoom
		});

		element.parentElement.addEventListener('wheel', wheelEvent);
		element.addEventListener('panzoomchange', changeEvent);
	};

  	$: render = ({ context }) => {
  		try {
		    context.drawImage(img, 0, 0);

			element = document.querySelector('.canvas-container-inner');
		    initPan();
  		}
	    catch(e) { console.log("err", e); }
  	};

  	$: {
  		if(!$settings.transparency) workAreaOpacity = tinycolor($backdrop).toRgb().a;
		else workAreaOpacity = 1;
  	};

  	let cropStartingPointX = 0;
  	let cropStartingPointY = 0;
  	let cropWidth = 0;
  	let cropHeight = 0;
  	let cropping = false;
  	let pixelWidth = 0;

  	$: testRender = ({ context, width, height }) => {
  		try {
  			if (!cropping) return;

  			context.globalAlpha = 1.0;
			context.fillStyle = "#171719";
  			context.fillRect(0, 0, width, height);

  			context.globalAlpha = 0.5;
		    context.drawImage(img, 0, 0);
  			context.globalAlpha = 1.0;

        	context.drawImage(
        		img,
        		cropStartingPointX,
				cropStartingPointY,
				cropWidth - cropStartingPointX,
				cropHeight - cropStartingPointY,
        		cropStartingPointX,
				cropStartingPointY,
				cropWidth - cropStartingPointX,
				cropHeight - cropStartingPointY
        	);
        
  			context.strokeStyle = "#FAA916";
		    context.beginPath();
		    context.lineWidth = pixelWidth*2;
		    context.setLineDash([pixelWidth * 6, pixelWidth * 3]);
			context.rect(
				cropStartingPointX,
				cropStartingPointY,
				cropWidth - cropStartingPointX,
				cropHeight - cropStartingPointY
			);
			context.stroke();
  		}
	    catch(e) { console.log("err", e); }
  	};

  	function handleMouseDown(e) {
  		//console.log("Canvas mousedown");
  		let canvas = e.srcElement;
        let positionInfo = canvas.getBoundingClientRect();
        let mousePos = helper.getMousePos(canvas, e, positionInfo);

        let biggerSideTrue = height > width ? height : width;
        let biggerSideVirt = positionInfo.height > positionInfo.width ? positionInfo.height : positionInfo.width;

        pixelWidth = Math.round(biggerSideTrue / biggerSideVirt);

        cropStartingPointX = helper.scaleNumber(mousePos.x, [0, positionInfo.width], [0, width]);
        cropStartingPointY = helper.scaleNumber(mousePos.y, [0, positionInfo.height], [0, height]);

        cropping = true;
  	}

  	function handleMouseUp(e) {
  		let args = {
			width: Math.ceil(cropWidth - cropStartingPointX),
			height: Math.ceil(cropHeight - cropStartingPointY),
			left: Math.ceil(cropStartingPointX),
			top: Math.ceil(cropStartingPointY)
		};

		//console.log(args);

		if (croppingMode) {
	  		ipcRenderer.send('editImage', {
				type: "crop",
				image: fileSelected,
				args: args
			});

	  		cropStartingPointX = 0;
	  		cropStartingPointY = 0;
	  		cropWidth = 0;
	  		cropHeight = 0;
	  		pixelWidth = 0

	  		cropping = false;
	  		croppingMode = false;
		}

		//close dropdowns here but be careful not to close ones that just opened
  	}

  	function handleMouseMove(e) {
  		mouseincanvas = true;

        let canvas = e.srcElement;
        let ctx = canvas.getContext('2d');

        let positionInfo = canvas.getBoundingClientRect();
        let mousePos = helper.getMousePos(canvas, e, positionInfo);

        let newWidth = helper.scaleNumber(mousePos.x, [0, positionInfo.width], [0, width]);
        let newHeight = helper.scaleNumber(mousePos.y, [0, positionInfo.height], [0, height]);

        if (pickingMode) {
	        let imageData = ctx.getImageData(newWidth, newHeight, 1, 1);
	        let pixel = imageData.data;
	        let pixelColor = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`;

	        chosenColor = tinycolor({ r: pixel[0], g: pixel[1], b: pixel[2] }).toHexString();
        }
        else if (croppingMode) {
        	cropWidth = newWidth;
        	cropHeight = newHeight;
        }
  	}

	function handlePaste(event) {
		if (!$settings.overwrite && fileSelected || settingsOpen) return;

		let text = event.clipboardData.getData('Text');
		if (text != "") {
			if (text.startsWith("data") && text.includes("image")) {
				//console.log("not text, sending stuff");
				//text is a data string, try to process it
				return ipcRenderer.send('file', text);
			}
			else if (text.startsWith("http")) {
				//console.log("not text, sending http");
				//text is a url string, try to process it
				return ipcRenderer.send('file', text);
			}
			else {
				//console.log("text pasted! text:", text);
				//account for pastes of other types of text?
			}
		}

		let items = (event.clipboardData  || event.originalEvent.clipboardData).items;

		let blob = null;
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf("image") === 0) blob = items[i].getAsFile();
			else{
				//afaik you can't really paste PSD here
			}
		}
		if (blob == null) return console.log("null blob");

		/*
			Electron doesn't want us sending blob objects via ipc
			so we'll handle it in-house instead.
		*/

		helper.getIMG(blob, (result) => {
			img.src = result;
			fileSelected = result;
		});
	}

	function mouseUpBlur() {
		let active = document.activeElement;
		let isInputText = active instanceof HTMLInputElement && active.type == 'number';
		let isSelect = active instanceof HTMLSelectElement;

		if (!isInputText && !isSelect) active.blur();
	}

	function normalizeTheme(theme) {
		if (theme && typeof theme == "string") return theme.toLowerCase();
		else if (theme && typeof theme == "boolean") {
			$settings.theme = "legacy";
		}
		else return "default";
	}

	$: if (settingsOpen) {
		croppingMode = false;
		pickingMode = false;
	}
</script>

<svelte:window
	on:paste={handlePaste}
	on:mouseup={mouseUpBlur}
/>

<main bind:this={mainElement} id={normalizeTheme($settings.theme)}>
	<Backframe />

	<div class="content">
		<Titlebar
			{settingsOpen}
			{version}
			{fileSelected}
			on:clear={e => {
				fileSelected = false;
		    	hex = undefined;
				pickingMode = false;
				croppingMode = false;
			    delInstance();
			}}
			on:copy={tbx.copyImage}
			on:settingsOpen={e => { settingsOpen = e.detail; }}
		/>
		<Toolbar
			{settingsOpen}
			{fileSelected}
			{hex}
			bind:this={tbx}
			bind:showDropdown
			on:cropImage={e => {
				pickingMode = false;
				croppingMode = true;
		  		instance.zoom(1, { animate: false });
	    		instance.pan(0, 0);
		  		instance.setOptions({ disablePan: true});
			}}
			on:pickColor={e => {
				croppingMode = false;
				pickingMode = true;
		  		instance.setOptions({ disablePan: true });
			}}
		/>
		<Desktop
			{fileSelected}
			{settingsOpen}
			bind:loading
		>
			{#if settingsOpen}
				<Menu
					{version}
					on:settingsOpen={e => { settingsOpen = e.detail; }}
				/>
			{/if}

			{#if loading}
				<Loader />
			{/if}

			{#if fileSelected && !loading}
				<div
					class="canvas-container"
					class:pixelated
					on:mousemove={handleCursor}
				>
					{#if pickingMode && mouseincanvas}
						<Cursor
							x={m.x}
							y={m.y}
							{chosenColor}
						/>
					{/if}

					{#if $settings.zoomslider}
						<Zoomslider {zoomscale} {instance} />
					{/if}

					<Zoomscale {zoomscale} {instance} />

					<div
						class="canvas-container-inner"
				    	style="opacity: {workAreaOpacity}"
						class:pickingMode
						class:croppingMode
				    	on:click={() => {
				    		setTimeout(() => {
					    		if (pickingMode) {
					    			pickingMode = false;
			  						instance.setOptions({ disablePan: false });
					    		}
				    		}, 100);
				    	}}
					>
					    <Canvas
					    	width={width}
					    	height={height}
					    	on:mousedown={handleMouseDown}
					    	on:mouseup={handleMouseUp}
					    	on:mousemove={handleMouseMove}
					    	on:mouseenter={() => { mouseincanvas = true; }}
					    	on:mouseleave={() => { mouseincanvas = false; }}
					    	on:click={() => {
					    		if (pickingMode) {
					    			pickingMode = false;
			  						instance.setOptions({ disablePan: false });
			  						if (hex == chosenColor) {
			  							//alert("choosing same color escape");
			  							showDropdown = true;
			  						}
					    			hex = chosenColor;
					    		}
					    	}}
					    >
							<Layer {render} />

							{#if croppingMode}
								<Layer render={testRender} />
							{/if}
						</Canvas>
					</div>
				</div>
			{/if}

			{#if !fileSelected && !loading}
				<Dropfield />
			{/if}

			<Actions />
		</Desktop>
	</div>

	<div class="test"></div>
</main>

<style lang="scss">
	main {
		overflow: hidden;
		background: transparent;

		.content {
			position: fixed;
			box-sizing: border-box;
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
	}

	.canvas-container {
		overflow: hidden;
		width: 100%;
		height: 100%;
		position: relative;

		&-inner {
			overflow: hidden;
			position: absolute;
			left: 0;
			top: 0;
			right: 0;
			bottom: 0;
			display: flex;
			justify-content: center;
			align-items: center;

			:global(canvas) {
			    max-width: 100%;
			    max-height: 100%;
			    width: unset !important;
			    height: unset !important;
			    object-fit: contain;
			    align-self: center;
			    z-index:9999 !important;
			    pointer-events:all !important;
			    cursor: grab;
			}

			&.croppingMode :global(canvas) {
				cursor: crosshair;
			}

			&.pickingMode :global(canvas) {
				cursor: none;
			}
		}
	}

	.pixelated {
		:global(canvas) {
		    image-rendering: -webkit-crisp-edges;
		    image-rendering: pixelated;
		    image-rendering: crisp-edges;
		}
	}
</style>
