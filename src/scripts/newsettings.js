import { writable } from 'svelte/store';
const { ipcRenderer } = require('electron');

let timeout;
let received = false;
let booted = false;

const store = () => {
  const state = {
    zoom: 0.3,
    hashsign: true,
    locale: 'en'
  };

  const { subscribe, set, update } = writable(state);

  ipcRenderer.on('settings', (event, arg) => {
    console.log("Got settings from the backend");
    if (received == true) received = false;
    set(arg);
    received = true;
  });

  const unsubscribe = subscribe((value) => {
    if (!booted) {
      booted = true;
      return;
    }
    if (!received) return;

    console.log("update within", value);

    clearTimeout(timeout);
    timeout = setTimeout(()=> {
      console.log("Sending settings to the backend");
      ipcRenderer.send('settings:write', value);
    }, 500);
  });

  return {
    subscribe,
    set
  };
}

export default store()