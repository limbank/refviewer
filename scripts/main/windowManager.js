const { BrowserWindow, shell } = require("electron");
const Lumberjack = require('./lumberjack.js');
const jack = new Lumberjack();

class windowManager {
    constructor (args) {
        this.windows = [];
        this.sp = args.sp;
        this.rp = args.rp;
        this.lw = args.lw;
        if (args.ready && typeof args.ready == "function") args.ready();
    }
    createWindow() {
        jack.log("CREATING WINDOW!!");

        this.windows.push(new BrowserWindow({
            width: 550,
            height: 400,
            minWidth: 238,
            minHeight: 238,
            frame: false,
            transparent: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            icon: "public/favicon.png",
        }));

        let w = this.windows[this.windows.length-1];

        w.loadFile("public/index.html");

        w.on("closed", () => {
            jack.log("WINDOW CLOSED!");
            this.windows.splice(this.windows.indexOf(w), 1);
            w = null;
            jack.log("Windows remaining:", this.windows.length);

            if (this.windows.length < 1) {
                //clean up temporary out file
                const fs = require('fs-extra')
                const os = require('os');
                const path = require('path');

                let psdPath = path.join(os.tmpdir(), 'out.png');
                fs.remove(psdPath, err => {
                  if (err) return jack.error(err);
                  jack.log('Removed temp PSD file');
                });
            }
        });

        w.webContents.on('will-navigate', function (e, url) {
            e.preventDefault();
            shell.openExternal(url);
        });

        w.webContents.on('did-finish-load', () => {
            w.webContents.send('settings', this.sp.settings);
            w.webContents.send('recents', this.rp.recents);
            w.webContents.send('argv', process.argv);

            //Attempted fix for persistent image
            try {
                delete process.argv;
            }
            catch(e) {
                console.log(e);
            }
        });
    }
    getWindowByID(id) {
        for (var i = 0; i < this.windows.length; i++) {
            if (this.windows[i].id == id) return this.windows[i];
        }

        return false;
    }
}

module.exports = windowManager;