<script>
	let setWindow = "recent";
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
						<div class="setting-toggler"></div>
					</div>
				</div>
				<div class="setting">
					<div class="setting-inner">
						<div class="setting-title">
							Legacy file select
						</div>
						<div class="setting-toggler"></div>
					</div>
					<div class="setting-description">
						Enable a separate button for clicking to select a file
					</div>
				</div>
				<div class="setting">
					<div class="setting-inner">
						<div class="setting-title">
							Developer mode
						</div>
						<div class="setting-toggler"></div>
					</div>
				</div>
			</div>
		{:else if setWindow=="about"}
			<div class="settings-container-inner">
				<div class="settings-container-text">
					v. 4.0.4
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
			width: 200px;
		}

		&-main {
			flex-grow: 1;
			background: #3A3940;
		}

		&-menu {
			padding: 10px;
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
			padding: 10px;
		}

		&-text {
			color: #B7B9BC;
			font-size: 14px;
			margin-bottom: 10px;
		}
	}

	.setting {
		border-bottom: 1px solid #2F2E33;
		padding: 5px 0 15px;
		margin-bottom: 5px;

		&-inner {
			display: flex;
		}

		&-title {
			font-size: 15px;
			color: #B7B9BC;
			font-weight: 500;
		}

		&-description {
			font-size: 11px;
			color: #B7B9BC;
			padding: 10px 0 0;
		}
	}
</style>
