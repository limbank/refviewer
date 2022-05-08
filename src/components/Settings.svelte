<script>
	const { ipcRenderer } = require('electron');

	let setWindow = "recent";

	export let settings = {};

	let timeout;

	$: {
		clearTimeout(timeout);
		timeout = setTimeout(()=> {
        	ipcRenderer.send('settings:write', settings);
		}, 500);
    }
</script>

<div class="settings-container">
	<div class="settings-container-sidebar">
		<ul class="settings-container-menu">
			<li
				class:active={setWindow=="recent"}
				on:click={e => { setWindow="recent"; }}
			>
				Recent
			</li>
			<li
				class:active={setWindow=="settings"}
				on:click={e => { setWindow="settings"; }}
			>
				Settings
			</li>
			<li
				class:active={setWindow=="about"}
				on:click={e => { setWindow="about"; }}
			>
				About
			</li>
		</ul>
	</div>
	<div class="settings-container-main">
		{#if setWindow=="recent"}
			recent
		{:else if setWindow=="settings"}
			<div class="settings-container-inner">
				<div class="setting">
					<div class="setting-inner">
						<div class="setting-title">
							Zoom speed
						</div>
						<div class="setting-control"></div>
					</div>
				</div>
				<div class="setting">
					<div class="setting-inner">
						<div class="setting-title">
							Allow overwrite
						</div>
						<div class="setting-control">
							<label class="switch">
								<input type="checkbox" bind:checked={settings.overwrite}>
								<span class="slider"></span>
							</label>
						</div>
					</div>
					<div class="setting-description">
						Allow selecting a new image while another image is loaded.
					</div>
				</div>
				<div class="setting">
					<div class="setting-inner">
						<div class="setting-title">
							Legacy file select
						</div>
						<div class="setting-control">
							<label class="switch">
								<input type="checkbox" bind:checked={settings.select}>
								<span class="slider"></span>
							</label>
						</div>
					</div>
					<div class="setting-description">
						Enable a separate button for clicking to select a file
					</div>
				</div>
				<div class="setting">
					<div class="setting-inner">
						<div class="setting-title">
							Legacy theme
						</div>
						<div class="setting-control">
							<label class="switch">
								<input type="checkbox" bind:checked={settings.theme}>
								<span class="slider"></span>
							</label>
						</div>
					</div>
				</div>
				<div class="setting">
					<div class="setting-inner">
						<div class="setting-title">
							Auto-save screenshots
						</div>
						<div class="setting-control">
							<label class="switch">
								<input type="checkbox" bind:checked={settings.autosave}>
								<span class="slider"></span>
							</label>
						</div>
					</div>
				</div>
				<div class="setting">
					<div class="setting-inner">
						<div class="setting-title">
							Developer mode
						</div>
						<div class="setting-control">
							<label class="switch">
								<input type="checkbox" bind:checked={settings.devmode}>
								<span class="slider"></span>
							</label>
						</div>
					</div>
				</div>
			</div>
		{:else if setWindow=="about"}
			<div class="settings-container-inner">
				<div class="settings-container-text">
					v. 4.0.9
				</div>
				<div class="settings-container-text">
					source.dog &copy; 2018-2022
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.settings-container {
		position: absolute;
		z-index: 2;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: #2F2E33;
		display: flex;

		&-sidebar {
			flex-shrink: 0;
			width: 150px;
		}

		&-main {
			flex-grow: 1;
			background: #3A3940;
			overflow-y: auto;
		}

		&-menu {
			padding: 8px;
			margin: 0;
			list-style: none;
			display: flex;
			flex-direction: column;

			li {
				display: inline-flex;
				font-weight: 500;
				color: #B7B9BC;
				padding: 5px 8px;
				font-size: 14px;
				margin-bottom: 2px;
				border-radius: 5px;
				cursor: pointer;
				user-select: none;

				&.active {
					background: #3A3940;
				}

				&:hover {
					background: #3A3940;
				}
			}
		}

		&-inner {
			padding: 8px 14px;
		}

		&-text {
			color: #B7B9BC;
			font-size: 14px;
			margin-bottom: 10px;
		}
	}

	.setting {
		border-bottom: 1px solid #2F2E33;
		padding: 8px 0 14px;
		margin-bottom: 5px;

		&-inner {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}

		&-title {
			font-size: 14px;
			color: #B7B9BC;
			font-weight: 500;
			display: inline-flex;
			align-items: center;
		}

		&-description {
			font-size: 11px;
			color: #B7B9BC;
			padding: 10px 0 0;
		}

		&-control {
			display: inline-flex;
			align-items: center;
		}
	}

	.switch {
		position: relative;
		overflow: hidden;
		display: inline-block;
		width: 30px;
		height: 20px;

		input { 
			opacity: 0;
			width: 0;
			height: 0;
			position: absolute;
			left: -1;
			top: -1;
			pointer-events: none;

			&:checked + .slider {
	  			background-color: #FAA916;
			}

			&:checked + .slider:before {
				transform: translateX(16px);
			}
		}

		.slider {
			position: absolute;
			cursor: pointer;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background-color: #2F2E33;
			transition: .2s;
			border-radius: 3px;

			&:before {
				position: absolute;
				content: "";
				height: 16px;
				width: 10px;
				left: 2px;
				bottom: 2px;
				background-color: #171719;
				transition: .2s;
				border-radius: 3px;
			}
		}
	}

</style>
