<script>
	export let version;
</script>

{#if version}
	<div class="about-text">
		v. {version}
	</div>
{/if}
<div class="about-text">
	limbank.org &copy; 2018-2023
</div>
<div class="about-text-title">
	Special thanks to:
</div>
<div class="about-text">
	GHOST<br>
	Sade<br>
	Ennoriel<br>
	hrfn<br>
	Charalian
</div>
<div class="about-text-title">
	Made with:
</div>
<div class="about-text">
	Electron<br>
	Svelte<br>
	Sharp
</div>
<div class="about-text-title">
	Links:
</div>
<div class="about-text">
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

	.about-list {
		padding: 0;
		margin: 0;
		list-style: none;
		display: flex;

		&-icon {
			display: inline-flex;
			padding: 0 5px;

			a {
				display: inline-flex;
				color: #B7B9BC;
				text-decoration: none;
				font-size: 20px;
			}
		}
	}
</style>
