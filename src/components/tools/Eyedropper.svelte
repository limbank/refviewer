<script>
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';

	import Button from '../common/Button.svelte';
	import Dropdown from '../common/Dropdown.svelte';
	import Colorpicker from './Colorpicker.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, content] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	export let showDropdown = false;
	export let closeDropdowns = false;
	export let hex;
	export let hashsign = true;
	export let tips = false;
	export let legacy = false;

	$: if (hex) showDropdown = true;
	$: if (closeDropdowns) showDropdown = false;
</script>

<Button
	tips={tips}
	size="12px"
	legacy={legacy}
	tiptext={"Pick a color"}
	on:click={e => {
		dispatch('pickColor');
	}}
>
	<i class="fas fa-eye-dropper" use:dropdownRef></i>
</Button>

{#if showDropdown}
	<Dropdown
		{content}
		on:close={e => { showDropdown = false; }}
	>
		<Colorpicker
			bind:hex
			alpha={false}
			{legacy}
			{hashsign}
			{tips} />
	</Dropdown>
{/if}

<style lang="scss">
</style>