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

	let color = {
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
	tiptext={"Pick a color"}
	on:click={e => {
		showDropdown = true;
		//dispatch('pickColor');
	}}
>
	<i class="fas fa-eye-dropper" use:dropdownRef></i>
</Tool>

{#if showDropdown}
	<Dropdown
		content={dropdownContent}
		on:close={e => {
			showDropdown = false;
		}}
	>
		<Colorpicker
			bind:color
			alpha={false}
			legacy={legacy}
			tips={tips} />
	</Dropdown>
{/if}

<style lang="scss">
</style>