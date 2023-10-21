<script>
	import { tt, locale, locales } from "../stores/i18n.js";
	import settings from '../stores/settings.js';
</script>

<div class="dropfield">
	<div class="dropfield-inner-wrapper">
		<div class="dropfield-inner">
			{#if !$settings.theme}
				<div class="dropfield-inner-icon">
					<i class="fas fa-upload"></i>
				</div>
			{/if}
			<div class="dropfield-inner-text">
				<div class="dropfield-inner-text-line">
					{$tt("dropfield.placeholder")}
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.dropfield {
		flex-grow:1;

		&-inner {
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
			user-select: none;

			&-icon {
				font-size: 35px;
				margin-bottom: 10px;
			}

			&-text {
				font-size: 18px;
				font-weight: bold;
				text-align: center;
			}

			&-wrapper {
				padding: 10px;
				width: 100%;
				height: 100%;
				display: flex;
				justify-content: center;
				align-items: center;
				box-sizing: border-box;
			}
		}
	}
</style>
