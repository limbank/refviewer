const fs = require('fs-extra');
const util = require('util');
const os = require('os');
const path = require('path');

const { name } = require('../../package.json');

class Lumberjack {
    constructor(args) {
        this.home = path.join(os.homedir(), '.' + name);
        this.logDir = path.join(this.home, "/logs");
        this.file = path.join(this.logDir, `log-${this.logDate}.txt`);
        this.logFile;
        this.devmode = true;

        fs.ensureDir(this.logDir, err => {
            //do something with the errors?
            fs.ensureFile(this.file, err => {
                this.logFile = fs.createWriteStream(this.file, { flags: 'a' });
            });
        });
    }
    colorString(string) {
        return `\x1b[36m${string}\x1b[0m`;
    }
    pad(n) {
        return String(n).padStart(2, '0');
    }
    get logDate() {
        let d = new Date;
        return `${
                    this.pad(d.getDay())
                        }${
                            this.pad(d.getMonth())
                            }${
                                this.pad(d.getYear())
                                }`;
    }
    get time() {
        let d = new Date;
        return this.colorString(
            `[${
                this.pad(d.getHours())
                }:${
                    this.pad(d.getMinutes())
                    }:${
                        this.pad(d.getSeconds())
                        }]`
        );
    }
    plog() {
        console.log(`${this.time}`, ...arguments);

        try {
            this.logFile.write(
                util.format.apply(null, [`${this.time}`, ...arguments]).replace(/\033\[[0-9;]*m/g,"") + '\n'
            );
        }
        catch(e) { }
    }
    log() {
        console.log(`${this.time}`, ...arguments);

        if (!this.devmode) return;
        try {
            this.logFile.write(
                util.format.apply(null, [`${this.time}`, ...arguments]).replace(/\033\[[0-9;]*m/g,"") + '\n'
            );
        }
        catch(e) { }
    }
}

module.exports = Lumberjack;