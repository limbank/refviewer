<script>
	import Titlebar from './components/Titlebar.svelte';
	import Desktop from './components/Desktop.svelte';
	import Toolbox from './components/Toolbox.svelte';

	import Dropzone from "svelte-file-dropzone";

	let files = {
	    accepted: []
	};

	function handleFilesSelect(e) {
	    const { acceptedFiles } = e.detail;
	    files.accepted = acceptedFiles;
	}
</script>

<main>
	<Titlebar fileSelected={files.accepted.length>0} />
	<Toolbox />
	<Desktop>
		{ #if files.accepted.length > 0 }
			{#each files.accepted as item}
			    <img src="{item.path}">
		  	{/each}
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
	main {
		background: #171719;
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		border-radius: 5px;
		display: flex;
		padding: 30px 5px 5px;
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
