<script>
	import { createEventDispatcher } from 'svelte';
	import { createPopperActions } from 'svelte-popperjs';

	import Tool from '../common/Tool.svelte';
	import Dropdown from '../common/Dropdown.svelte';
	import Colorpicker from './Colorpicker.svelte';

	const dispatch = createEventDispatcher();

	const [dropdownRef, content] = createPopperActions({
	    placement: 'right-start',
	    strategy: 'fixed',
	});

	let showDropdown = false;

	export let hex;
	export let tips = false;
	export let legacy = false;

	$: if (hex) showDropdown = true;
</script>

<Tool
	tips={tips}
	size="12px"
	legacy={legacy}
	tiptext={"Pick a color"}
	on:click={e => {
		dispatch('pickColor');
	}}
>
	<i class="fas fa-eye-dropper" use:dropdownRef></i>
</Tool>

{#if showDropdown}
	<Dropdown
		{content}
		on:close={e => { showDropdown = false; }}
	>
		<Colorpicker
			bind:hex
			alpha={false}
			legacy={legacy}
			tips={tips} />
	</Dropdown>
{/if}

<style lang="scss">
</style>