<script>
	export let version;

	import { tt, locale, locales } from "../../stores/i18n.js";
</script>

<div class="about-split">
	<div class="about-split-item">
		{#if version}
			<div class="about-text">
				v. {version}
			</div>
		{/if}
		<div class="about-text">
			limbank.org &copy; 2018-2023
		</div>
	</div>
	<div class="about-split-item">
		<div class="about-links">
			<ul class="about-list">
				<li class="about-list-icon">
					<a href="https://trello.com/b/NlCLf8lW/refviewer"><i class="fab fa-trello"></i></a>
				</li>
				<li class="about-list-icon">
					<a href="https://github.com/limbank/refviewer/"><i class="fab fa-github-square"></i></a>
				</li>
				<li class="about-list-icon">
					<a href="https://limbank.github.io/refviewer/"><i class="fas fa-home"></i></a>
				</li>
			</ul>
		</div>
	</div>
</div>
<div class="about-split">
	<div class="about-split-item">
		<div class="about-text-title">
			{$tt("about.thanks")}:
		</div>
		<div class="about-text">
			GHOST<br>
			Sade<br>
			Ennoriel<br>
			hrfn<br>
			Chawldol
		</div>
	</div>
	<div class="about-split-item">
		<div class="about-text-title">
			{$tt("about.madewith")}:
		</div>
		<div class="about-text">
			Electron<br>
			Svelte<br>
			Sharp
		</div>
	</div>
</div>
<div class="about-text-title">
	{$tt("about.translation")}:
</div>
<div class="about-text">
	Chawldol<br>
	Bjarne V&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;
</div>

<style lang="scss">
	.about {
		&-text {
			color: var(--main-txt-color);
			font-size: 12px;
			margin-bottom: 10px;

			&-title {
				font-size: 14px;
				color: var(--main-txt-color);
				border-bottom: 1px solid var(--secondary-bg-color);
			    padding: 5px 0;
			    margin-bottom: 8px;
			}
		}

		&-links {
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: flex-end;
		}

		&-split {
			display: flex;

			&-item {
				width: 50%;
				flex-basis: 50%;

				&:first-child {
					margin-right: 10px;
				}
			}
		}

		&-list {
			padding: 0;
			margin: 0;
			list-style: none;
			display: flex;

			&-icon {
				display: inline-flex;
				padding: 0 5px;

				a {
					display: inline-flex;
					color: var(--main-txt-color);
					text-decoration: none;
					font-size: 20px;
				}
			}
		}
	}
</style>
