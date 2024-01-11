import { derived, writable } from "svelte/store";
const { ipcRenderer } = require('electron');
import translations from "./locales";

import settings from './settings.js';

export const locale = writable("en");
export const locales = Object.keys(translations);

function translate(locale, key, vars) {
  if (!key) return "no key";
  if (!locale) return key;

  // Grab the translation from the translations object.
  let text = translations[locale] ? translations[locale][key] : translations['en'][key];

  if (!text) text = translations['en'][key];
  if (!text) return `${locale}.${key}`;

  // Replace any passed in variables in the translation string.
  Object.keys(vars).map((k) => {
    const regex = new RegExp(`{{${k}}}`, "g");
    text = text.replace(regex, vars[k]);
  });

  return text;
}

export const tt = derived(locale, ($locale) => (key, vars = {}) =>
  translate($locale, key, vars)
);

settings.subscribe((arg) => {
  locale.set(arg.locale);
});
