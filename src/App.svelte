<script>
	import Titlebar from './components/Titlebar.svelte';
	import Desktop from './components/Desktop.svelte';
	import Toolbox from './components/Toolbox.svelte';
	import Actions from './components/Actions.svelte';
	import Loader from './components/Loader.svelte';
	import Menu from './components/menu/Menu.svelte';
	import Dropfield from './components/Dropfield.svelte';
	import Cursor from './components/Cursor.svelte';
	import Zoomscale from './components/Zoomscale.svelte';
	import tinycolor from 'tinycolor2';

	var HTMLParser = require('node-html-parser');
	import { Canvas, Layer, t } from "svelte-canvas";

	import Panzoom from '@panzoom/panzoom';

	const { ipcRenderer } = require('electron');

	let file = false;
	let width;
	let height;
	let zoomed = false;
	let settings = {};
	let settingsOpen = false;
	let defaultDims;
	let pickingmode = false;

	let proxySettings;
	let recents;
	let initUpdate = 0;
	let instance;
	let version = "4.0.33";

	let loading = false;

	let pickedColor;
	let chosenColor;
	let mouseincanvas = false;

	let zoomscale = 1;

	let backdropColor = "#2F2E33";

	let readablefiletypes = ['img', 'png', 'bmp', 'gif', 'jpeg', 'jpg', 'psd', 'tif', 'tiff', 'dng', 'webp'];

	let m = { x: 0, y: 0 };

	function handleCursor(event) {
		m.x = event.clientX;
		m.y = event.clientY;
	}

	ipcRenderer.on('recents', (event, arg) => {
		recents = arg;
	});

	ipcRenderer.on('settings', (event, arg) => {
		if (settings.zoom && settings.zoom != arg.zoom && instance) {
			let element = document.querySelector('.canvas-container-inner');
			initPan(element, arg.zoom);
		}

		settings = arg;
		initUpdate++;
		if (initUpdate<2) {
			console.log("REPEATED UPDATE FAILED!", initUpdate);
			proxySettings = settings;
		}
	});

	let img = new Image(); 

	function initPan(element, customZoom = false) {
		if (!element) return;

	    try {
	    	console.log("test");

	    	instance.destroy();
	    }
	    catch(e) {/*console.log("errrrr", e);*/}

		// And pass it to panzoom
		instance = Panzoom(element, {
			maxScale: 10000,
			step: customZoom || settings.zoom
		});
		element.parentElement.addEventListener('wheel', instance.zoomWithWheel);
		element.addEventListener('panzoomchange', (event) => {
			/*
			if (pickingmode) {
				event.preventDefault();
				console.log("pcikingmode change");
			}*/
			zoomscale = Number(event.detail.scale).toFixed(1);

		  	if (event.detail.scale >= 10) zoomed = true;
			else zoomed = false;
		})
	};

  	$: render = ({ context }) => {
  		try {
		    context.drawImage(img, 0, 0);

			let element = document.querySelector('.canvas-container-inner');
		    initPan(element);
  		}
	    catch(e) {console.log("errrrr", e);}
  	};

  	let workAreaOpacity = {a:1};

  	$: {
  		if(!settings.transparency) workAreaOpacity = tinycolor(backdropColor).toRgb();
		else workAreaOpacity = {a:1};
  	};

	function verifyCompatibility(url) {
		for (var i = 0; i < readablefiletypes.length; i++) {
			if (url.toLowerCase().endsWith(readablefiletypes[i])) return true;
		}

		return false;
	}

    function getMousePos(canvas, evt, rect) {
        return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    }

    function scaleNumber(num, oldRange, newRange){
        var a = oldRange[0], b = oldRange[1], c = newRange[0], d = newRange[1];
        return (b*c - (a)*d)/(b-a) + (num)*(d/(b-a));
    }

  	function handleMousemove(e) {
  		if (!pickingmode) return;

  		mouseincanvas = true;

        var canvas = e.srcElement;
        var ctx = canvas.getContext('2d');

        var positionInfo = canvas.getBoundingClientRect();
        //console.log("POSINFO", positionInfo);

        var mousePos = getMousePos(canvas, e, positionInfo);

        var newWidth = scaleNumber(mousePos.x, [0, positionInfo.width], [0, width]);
        var newHeight = scaleNumber(mousePos.y, [0, positionInfo.height], [0, height]);

        var imageData = ctx.getImageData(newWidth, newHeight, 1, 1);
        var pixel = imageData.data;
        var pixelColor = "rgba("+pixel[0]+", "+pixel[1]+", "+pixel[2]+", "+pixel[3]+")";

        chosenColor = tinycolor({ r: pixel[0], g: pixel[1], b: pixel[2] }).toHexString();
  	}

	function handleFilesSelect(e) {
		if (!settings.overwrite && file || settingsOpen) return;

		loading = true;

		//console.log(e.dataTransfer.files);
	    //console.log(e.dataTransfer.files);

	    const acceptedFiles = Array.from(e.dataTransfer.files);
	    const acceptedItems = Array.from(e.dataTransfer.items);

	    if (acceptedFiles.length > 0) {
	    	ipcRenderer.send('file', acceptedFiles[0].path);
	    }
	    else if (acceptedItems.length > 0) {
		    let items = e.dataTransfer;

			let testHTML = items.getData("text/html");

			if (testHTML) {
				console.log("GOT HTML!", testHTML);
				//gotten HTML, likely an IMG tag
				let image = HTMLParser.parse(testHTML).querySelector('img');
				let url = HTMLParser.parse(testHTML).querySelector('a');

				console.log(image, url, "test123");

				if (image) {
					let srctext = image.getAttribute('src');

					console.log("extracted src", srctext);

					if (srctext.toLowerCase().startsWith("data")) {
						ipcRenderer.send('file', srctext);
					}
					else if (srctext.toLowerCase().startsWith("http")) {
						console.log("got html, sending")
						ipcRenderer.send('file', srctext);
					}
				}
				else if (url) {
					let srctext = url.getAttribute('href');

					ipcRenderer.send('file', srctext);
				}
			}
			else {
		    	let text = items.getData("text");

				console.log("hi idk lmao", text);
				ipcRenderer.send('file', text);
			}
	    }
	    else {
		    let items = e.dataTransfer;
		    let text = items.getData("text");
		    console.log(text, "gotten text");

		    //HANDLE URL, DATA, AND WHATEVER ERRORS HERE
	    }
	}

	img.onload = function(){
	  	width = img.width;
	  	height = img.height;
	};

	ipcRenderer.on('deliver', (event, arg) => {
		console.log("loading file!");
		img.src = arg;
		loading = false;
		file = arg;
	});

	/*
		NOTE!!!

		Maybe add a setting that separates clicking
		into a separate button.

		Add image selection by dropping text in
	*/

	function handlePaste(event) {
		if (!settings.overwrite && file || settingsOpen) return;

		if (event.clipboardData.getData('Text') != "") {
			console.log("test pasted! handle URL?");
		}

		let items = (event.clipboardData  || event.originalEvent.clipboardData).items;

		let blob = null;
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf("image") === 0) blob = items[i].getAsFile();
			else{
				//afaik you can't really paste PSD here
			}
		}
		if (blob == null) return;

		/*
			Electron doesn't want us sending blob objects via ipc
			so we'll handle it in-house instead.

		*/
		getIMG(blob);
	}

	function getIMG(blob){
		console.log("preparing img");

		var a = new FileReader();
        a.onload = function(e) {
			img.src = e.target.result;
			file = e.target.result;
        }
        a.readAsDataURL(blob);
	}

	/*
		 on:click={(e) => {
			ipcRenderer.send('action', "test");
		}}
	*/
</script>

<svelte:window on:paste={handlePaste} />

<div class="backdrop" class:legacy={settings.theme}>
	<div class="backdrop-bg backdrop-top"></div>
	<div class="backdrop-bg backdrop-right"></div>
	<div class="backdrop-bg backdrop-bottom"></div>
	<div class="backdrop-bg backdrop-left"></div>
</div>

<main class:legacy={settings.theme}>
	<Titlebar
		fileSelected={file}
		settingsOpen={settingsOpen}
		overwrite={settings.overwrite}
		legacy={settings.theme}
		tips={settings.tooltips}
		version={version}
		on:clear={e => {
			file = false;

	    	backdropColor = "#2F2E33";

		    try {
		    	console.log("destroying");
		    	instance.destroy();
		    }
		    catch(e) {
		    	console.log("err", e)
		    }
		}}
		on:settingsOpen={e => { settingsOpen = e.detail; }}
	/>
	<Toolbox
		settingsOpen={settingsOpen}
		fileSelected={file}
		legacy={settings.theme}
		tips={settings.tooltips}
		bind:pickedColor
		bind:backdropColor
		on:pickColor={e => {
			pickingmode = true;
	  		instance.setOptions({disablePan:true});
		}}
	/>
	<Desktop
		{backdropColor}
		legacy={settings.theme}
		on:dragover={(e) => { e.preventDefault(); }}
		on:drop={handleFilesSelect}
	>
		{#if settingsOpen}
			<Menu
				settings={proxySettings}
				recents={recents}
				version={version}
				on:settingsOpen={e => { settingsOpen = e.detail; }}
			/>
		{/if}

		{#if loading}
			<Loader />
		{/if}

		{#if file}
			<div
				class="canvas-container"
				class:pixelated={zoomed}
				on:mousemove={handleCursor}
			>
				{#if pickingmode && mouseincanvas}
					<Cursor
						x={m.x}
						y={m.y}
						bg={chosenColor}
					/>
				{/if}

				<Zoomscale {zoomscale} {instance} />

				<div
					class="canvas-container-inner"
					class:pickingmode
			    	on:click={() => {
			    		setTimeout(() => {
				    		if (pickingmode) {
				    			pickingmode = false;
		  						instance.setOptions({disablePan:false});
				    		}
			    		}, 100);
			    	}}

			    	style="opacity: {workAreaOpacity.a}"
				>
				    <Canvas
				    	width={width}
				    	height={height}
				    	on:mousemove={handleMousemove}
				    	on:mouseenter={() => {mouseincanvas=true;}}
				    	on:mouseleave={() => {mouseincanvas=false;}}
				    	on:click={() => {
				    		if (pickingmode) {
				    			pickingmode = false;
		  						instance.setOptions({disablePan:false});
				    			pickedColor = chosenColor;

				    			console.log("COLOR UPDATE!", pickedColor);
				    		}
				    	}}
				    >
						<Layer {render} />
					</Canvas>
				</div>
			</div>
		{/if}

		{#if !file && !loading}
			<Dropfield
				legacy={settings.theme}
				on:select={e => {
					alert("woop");
				}}
			/>
		{/if}

		<Actions />
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

		&.legacy {
			border-radius: 0PX;
		}

		&-bg {
			background: #171719;
			position: absolute;
		}

		&.legacy &-bg {
			background: #111111;
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

		&.legacy {
			border-radius: 0PX;
			padding: 35px 10px 10px;
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

			&.pickingmode :global(canvas) {
				/*
				cursor: url("data:image/x-icon;base64,AAACAAEAICAQAAAAAADoAgAAFgAAACgAAAAgAAAAQAAAAAEABAAAAAAAAAIAAAAAAAAAAAAAEAAAAAAAAAAAAAAAh4eHAL+/vwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIQAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAACEAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAhAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////////////////////////////////////////////////////////////////////////////////////D////g///+AP///gD///8B////A////sP///0D///6M///9H///+j////R////o////0f///9P////H////w=="),auto;*/
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

	@media only screen and (max-width: 300px) {
		.backdrop {
			&-left {
				left: 0;
				top: 0;
				bottom: 0;
				width: 17px;
			}
		}
	}
</style>
