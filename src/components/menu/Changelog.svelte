<script>
</script>

<div class="about-text-title">
	New features
</div>
<ul class="change-list">
	<li>
		Added a clickable badge with the zoom amount that resets the pan and zoom on click
	</li>
	<li>
		Added the option to make the workspace area transparent
	</li>
	<li>
		The cursor now shows colors when color picking instead of using the button's background
	</li>
	<li>
		Added the option to reset the workspace color
	</li>
	<li>
		Added the setting to disable  tooltips
	</li>
	<li>
		Added the overwrite setting to prevent replacing active image
	</li>
	<li></li>
</ul>
<div class="about-text-title">
	Fixes/Updates
</div>
<ul class="change-list">
	<li>
		Fixed a bug where the colorpicker was off by a quarter-pixel
	</li>
	<li>
		The menu is no longer a dropdown, shows up over the workspace
	</li>
	<li>
		The delete image button and tools now only show up when an image is selected
	</li>
	<li>
		Added the setting to switch to the legacy theme
	</li>
	<li>
		Replaced the eyedropper color info window with a color picker
	</li>
	<li>
		Added the option to copy the color with a click to the color picker
	</li>
	<li>
		Workspace color now resets when the image is cleared
	</li>
	<li></li>
</ul>
<div class="about-text-title">
	Misc
</div>
<ul class="change-list">
	<li>
		Changed the theme
	</li>
	<li>
		Changed the framework from jQuery to Svelte
	</li>
	<li>
		The about window now opens inside the main window
	</li>
	<li>
		The settings window now opens inside the main window
	</li>
	<li></li>
</ul>

<style lang="scss">
	.about-text {
		color: #B7B9BC;
		font-size: 12px;
		margin-bottom: 10px;

		&-title {
			font-size: 14px;
			color: #B7B9BC;
			border-bottom: 1px solid #2F2E33;
		    padding: 5px 0;
		    margin-bottom: 8px;
		}
	}

	.change-list {
		padding: 0 0 0 15px;
		margin: 0;
		color: #B7B9BC;
		font-size: 12px;
	}
</style>
