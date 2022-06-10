<script>
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';

	import Tool from './Tool.svelte';
	import Dropdown from './Dropdown.svelte';
	import Colorpicker from './Colorpicker.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, dropdownContent] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	export let backdropColor = {
		hex: "#000000",
		r: "0",
		g: "0",
		b: "0",
		a: "1"
	};

	let showDropdown = false;

	export let tips = false;
	export let legacy = false;
</script>

<Tool
	tips={tips}
	size="12px"
	legacy={legacy}
	tiptext={"Change background"}
	on:click={e => {
		showDropdown = true;
		//dispatch('pickColor');
	}}
>
	<i class="fas fa-fill" use:dropdownRef></i>
</Tool>

{#if showDropdown}
	<Dropdown
		content={dropdownContent}
		on:close={e => {
			showDropdown = false;
		}}
	>
		<Colorpicker
			bind:color={backdropColor}
			reset={{
				hex: "#2F2E33",
				r: "47",
				g: "46",
				b: "51",
				a: "1"
			}}
			legacy={legacy}
			tips={tips} />
	</Dropdown>
{/if}

<style lang="scss">
</style>