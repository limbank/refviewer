<script>
	const { ipcRenderer } = require('electron');

	export let fileSelected = false;
	export let settings = false;

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
	{#if fileSelected && !settings}
		<button class="control" on:click={copyImage}>
	    	<i class="far fa-clipboard"></i>
		</button>
		<button class="control" on:click={e => { ipcRenderer.send('saveImage', fileSelected); }}>
	    	<i class="far fa-save"></i>
		</button>
		<!--
		<button class="control control-">
	    	<i class="fas fa-sync-alt"></i>
		</button>
		<button class="control control-">
	    	<i class="fas fa-redo"></i>
		</button>
		<button class="control control-">
	    	<i class="fas fa-eye-dropper"></i>
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

	.control {
		box-sizing: border-box;
		color: #171719;
		background: #3A3940;
		border-radius: 3px;
		border: 0;
		margin: 0;
		padding: 2px 0 0;
		height: 20px;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		width: 30px;
		transition: color 0.1s ease-out;
		margin-bottom: 5px;
		font-size: 14px;

		&:first-child {
			margin-top: 0px;
		}

		&:last-child {
			margin-bottom: 0px;
		}

		&:hover {
			background: #FAA916;
		}

		/*
		&-close {
			&:hover {
				background: #F75825;
			}
		}*/
	}
</style>
