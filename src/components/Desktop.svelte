<script>
	const HTMLParser = require('node-html-parser');
	const { ipcRenderer, webUtils } = require('electron');

	import { tt, locale, locales } from "../stores/i18n.js";
	import settings from '../stores/settings.js';
	import backdrop from '../stores/backdrop.js';
	import fileSelected from '../stores/fileSelected.js';
	import settingsOpen from '../stores/settingsOpen.js';

	export let loading = false;

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
		if (!$settings.overwrite && $fileSelected || $settingsOpen) return;

		loading = true;

	    const acceptedFiles = Array.from(e.dataTransfer.files);
	    const acceptedItems = Array.from(e.dataTransfer.items);

		// THIS IS HOW WE GET FILE PATHS NOW
		const attemptPath = webUtils.getPathForFile(acceptedFiles[0])

	    if (acceptedFiles.length > 0 && attemptPath != "") {
	    	ipcRenderer.send('file', attemptPath);
	    }
	    else if (acceptedItems.length > 0) {
			let testHTML = e.dataTransfer.getData("text/html");

			if (testHTML) {
				if (testHTML.startsWith("data") && testHTML.includes("image")) {
					//gotten a plain data string
					//console.log("data");
					ipcRenderer.send('file', testHTML);
				}
				else if (testHTML.startsWith("http")) {
					//gotten a plain url string
					//console.log("http");
					ipcRenderer.send('file', decodeHTMLEntities(testHTML));
				}
				else {
					//gotten HTML, likely an IMG tag
					let parsedHTML = HTMLParser.parse(testHTML);

					let image = parsedHTML.querySelector('img');
					let url = parsedHTML.querySelector('a');

					if (image) {
						let srctext = image.getAttribute('src');

						if (srctext.startsWith("data")) {
							//console.log("parsed data");
							ipcRenderer.send('file', srctext);
						}
						else if (srctext.startsWith("http")) {
							//console.log("parsed http");
							ipcRenderer.send('file', srctext);
						}
					}
					else if (url) {
						//console.log("parsed url");
						ipcRenderer.send('file', url.getAttribute('href'));
					}
					else {
						loading = false;
						ipcRenderer.send('action', $tt("desktop.unrecognized"));
					}
				}
			}
			else {
				//console.log("text");
				ipcRenderer.send('file', e.dataTransfer.getData("text"));
			}
	    }
	    else {
		    let text = e.dataTransfer.getData("text");
		    //console.log("gotten text", text);

		    //HANDLE URL, DATA, AND WHATEVER ERRORS HERE
	    }
	}
</script>

<div
	class="desktop"
	on:dragover|preventDefault
	on:drop|preventDefault={handleFilesSelect}
	style="background:{$backdrop};"
>
	<slot></slot>
</div>

<style lang="scss">
	.desktop {
		background: var(--secondary-bg-color);
		flex-grow: 1;
		border-radius: 3px;
		display: flex;
		overflow: hidden;
		position: relative;
	}
</style>
