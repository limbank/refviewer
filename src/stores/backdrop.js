import { writable } from 'svelte/store';

let booted = false;

const store = () => {
  let state = getComputedStyle(document.body)
    .getPropertyValue('--secondary-bg-color');

  const { subscribe, set, update } = writable(state);

  const unsubscribe = subscribe((value) => {
    if (!booted) {
      booted = true;
      return;
    }

    console.log("update within", value);
  });

  return {
    subscribe,
    set
  };
}

export default store();