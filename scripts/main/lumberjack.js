const fs = require('fs-extra');
const util = require('util');
const os = require('os');
const path = require('path');

class Lumberjack {
    constructor(args) {
        this.home = path.join(os.homedir(), '.refviewer');
        this.logFile = fs.createWriteStream(path.join(this.home, 'log.txt'), { flags: 'a' });
    }
    colorString(string) {
        return `\x1b[36m${string}\x1b[0m`;
    }
    get time() {
        let d = new Date;
        return this.colorString(`[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}]`);
    }
    log() {
        console.log(`${this.time}`, ...arguments);
        this.logFile.write(
            util.format.apply(null, [`${this.time}`, ...arguments]).replace(/\033\[[0-9;]*m/g,"") + '\n'
        );
    }
}

module.exports = Lumberjack;