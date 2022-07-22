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

	let hex = "#000000";

	let showDropdown = false;

	export let tips = false;
	export let legacy = false;
	export let pickedColor;

	const hex2rgb = (hex) => {
	    const r = parseInt(hex.slice(1, 3), 16)
	    const g = parseInt(hex.slice(3, 5), 16)
	    const b = parseInt(hex.slice(5, 7), 16)
	    // return {r, g, b} // return an object
	    return [ r, g, b ];
	}

	function rgb2hsv(r,g,b) {
	  let v=Math.max(r,g,b), c=v-Math.min(r,g,b);
	  let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
	  return [60*(h<0?h+6:h), v&&c/v, v];
	}

	function manageDropdown() {
		hex = pickedColor;

		showDropdown = true;

		console.log("generated color", hex);
	}

	$: if (pickedColor) manageDropdown();
</script>

<Tool
	tips={tips}
	size="12px"
	legacy={legacy}
	tiptext={"Pick a color"}
	on:click={e => {
		//showDropdown = true;
		dispatch('pickColor');
	}}
>
	<i class="fas fa-eye-dropper" use:dropdownRef></i>
</Tool>

{#if showDropdown}
	<Dropdown
		content={dropdownContent}
		on:close={e => {
			showDropdown = false;
			pickedColor = false;
		}}
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