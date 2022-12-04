<script>
	const HTMLParser = require('node-html-parser');
	const { ipcRenderer } = require('electron');

	export let legacy = false;
	export let settings = {};
	export let loading = false;
	export let backdropColor = "#2F2E33";
	export let settingsOpen;
	export let fileSelected;

	const decodeHTMLEntities = text => {
	    // Create a new element or use one from cache, to save some element creation overhead
	    const el = decodeHTMLEntities.__cache_data_element 
	             = decodeHTMLEntities.__cache_data_element 
	               || document.createElement('div');
	    
	    const enc = text
	        // Prevent any mixup of existing pattern in text
	        .replace(/⪪/g, '⪪#')
	        // Encode entities in special format. This will prevent native element encoder to replace any amp characters
	        .replace(/&([a-z1-8]{2,31}|#x[0-9a-f]+|#\d+);/gi, '⪪$1⪫');

	    // Encode any HTML tags in the text to prevent script injection
	    el.textContent = enc;

	    // Decode entities from special format, back to their original HTML entities format
	    el.innerHTML = el.innerHTML
	        .replace(/⪪([a-z1-8]{2,31}|#x[0-9a-f]+|#\d+)⪫/gi, '&$1;')
	        .replace(/#⪫/g, '⪫');
	   
	    // Get the decoded HTML entities
	    const dec = el.textContent;
	    
	    // Clear the element content, in order to preserve a bit of memory (it is just the text may be pretty big)
	    el.textContent = '';

	    return dec;
	}

	function handleFilesSelect(e) {
		if (!settings.overwrite && fileSelected || settingsOpen) return;

		loading = true;

	    const acceptedFiles = Array.from(e.dataTransfer.files);
	    const acceptedItems = Array.from(e.dataTransfer.items);

	    if (acceptedFiles.length > 0) ipcRenderer.send('file', acceptedFiles[0].path);
	    else if (acceptedItems.length > 0) {
			let testHTML = e.dataTransfer.getData("text/html");

			if (testHTML) {
				if (testHTML.startsWith("data") && testHTML.includes("image")) {
					//gotten a plain data string
					ipcRenderer.send('file', testHTML);
				}
				else if (testHTML.startsWith("http")) {
					//gotten a plain url string
					ipcRenderer.send('file', decodeHTMLEntities(testHTML));
				}
				else {
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
					else {
						loading = false;
						ipcRenderer.send('action', "Unrecognized format");
					}
				}
			}
			else ipcRenderer.send('file', e.dataTransfer.getData("text"));
	    }
	    else {
		    let text = e.dataTransfer.getData("text");
		    console.log("gotten text", text);

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
	<slot></slot>
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
			margin-top: 10px;
		}
	}
</style>
