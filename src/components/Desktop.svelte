<script>
	const HTMLParser = require('node-html-parser');
	const { ipcRenderer } = require('electron');

	export let legacy = false;
	export let settings = {};
	export let loading = false;
	export let backdropColor = "#2F2E33";
	export let settingsOpen;
	export let fileSelected;

	function handleFilesSelect(e) {
		if (!settings.overwrite && fileSelected || settingsOpen) return;

		loading = true;

	    const acceptedFiles = Array.from(e.dataTransfer.files);
	    const acceptedItems = Array.from(e.dataTransfer.items);

	    if (acceptedFiles.length > 0) ipcRenderer.send('file', acceptedFiles[0].path);
	    else if (acceptedItems.length > 0) {
			let testHTML = e.dataTransfer.getData("text/html");

			if (testHTML) {
				//gotten HTML, likely an IMG tag
				let parsedHTML = HTMLParser.parse(testHTML);
				let image = parsedHTML.querySelector('img');
				let url = parsedHTML.querySelector('a');

				if (image) {
					let srctext = image.getAttribute('src');

					if (srctext.startsWith("data")) ipcRenderer.send('file', srctext);
					else if (srctext.startsWith("http")) ipcRenderer.send('file', srctext);
				}
				else if (url) ipcRenderer.send('file', url.getAttribute('href'));
			}
			else ipcRenderer.send('file', e.dataTransfer.getData("text"));
	    }
	    else {
		    let text = e.dataTransfer.getData("text");
		    console.log(text, "gotten text");

		    //HANDLE URL, DATA, AND WHATEVER ERRORS HERE
	    }
	}
</script>

<div
	class="desktop"
	class:legacy
	on:dragover={(e) => { e.preventDefault(); }}
	on:drop={handleFilesSelect}
	style="background:{backdropColor};"
>
	<slot ></slot>
</div>

<style lang="scss">
	.desktop {
		background: rgba(47, 46, 51, 1);
		flex-grow: 1;
		border-radius: 3px;
		display: flex;
		overflow: hidden;
		position: relative;

		&.legacy {
			padding-top: 10px;
		}
	}
</style>
