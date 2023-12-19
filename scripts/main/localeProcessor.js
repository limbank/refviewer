const translations = require('../../src/stores/locales.js');
const Lumberjack = require('./lumberjack.js');
const jack = new Lumberjack();

class localeProcessor {
    constructor(data) {
        this.sp = data.sp;
    }
    tt(key, vars = {}) {
        if (!key) return "no key";
        if (!this.sp.settings.locale) return key;

        // Grab the translation from the translations object.
        let text = translations[this.sp.settings.locale][key];

        //show default en version instead of key name?
        if (!text) return `${this.sp.settings.locale}.${key}`;

        // Replace any passed in variables in the translation string.
        Object.keys(vars).map((k) => {
            const regex = new RegExp(`{{${k}}}`, "g");
            text = text.replace(regex, vars[k]);
        });

        return text;
    }
}

module.exports = localeProcessor;