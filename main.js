const { app, BrowserWindow, ipcMain, dialog  } = require("electron");

const os = require('os');
const path = require('path');

const imageDataURI = require('image-data-uri');
const fs = require('fs-extra');

class recentsProcessor {
    constructor(data) {
        this.home = data.home;
        this.filename = data.filename;
        this.file = path.join(this.home, this.filename);
        this.recents = [];

        fs.ensureFile(this.file, err => {
            this.readRecents(data.ready);
        });
    }
    readRecents(callback) {
        fs.readJson(this.file, (err, packageObj) => {
            let returnData = {};

            if (!err) {
                this.recents = packageObj;
                returnData = packageObj;
            }

            if (callback && typeof callback == "function") callback(returnData);
        });
    }
    writeRecents(recents = {}, callback) {
        this.recents = recents;

        fs.writeJson(this.file, recents, err => {
            if (err) return console.error(err);

            if (callback && typeof callback == "function") callback();
        });
    }
}

class settingsProcessor {
    constructor(data) {
        this.home = data.home;
        this.filename = data.filename;
        this.file = path.join(this.home, this.filename);
        this.settings = { zoom: 0.3 };

        fs.ensureFile(this.file, err => {
            this.readSettings(data.ready);
        });
    }
    readSettings(callback) {
        fs.readJson(this.file, (err, packageObj) => {
            let returnData = {};

            if (!err) {
                this.settings = packageObj;
                returnData = packageObj;
            }

            if (callback && typeof callback == "function") callback(returnData);
        });
    }
    writeSettings(settings = {}, callback) {
        this.settings = settings;

        fs.writeJson(this.file, settings, err => {
            if (err) return console.error(err);

            if (callback && typeof callback == "function") callback();
        });
    }
}

class fileProcessor {
    handleDefault(path, event) {
        event.reply('deliver', path);
    }
    handleImage(path, event) {
        if (path.startsWith("http")) {
            imageDataURI.encodeFromURL(path)
            .then(
                (response) => {
                    event.reply('deliver', response);
                });
        }
        else {
            imageDataURI.encodeFromFile(path)
            .then(
                (response) => {
                    event.reply('deliver', response);
                });
        }
    }
    process(file, event) {
        let ext = file.substr(file.lastIndexOf(".") + 1).toLowerCase();

        switch(ext) {
            case "png": 
                this.handleImage(file, event);
                break;
            case "jpeg": 
                this.handleImage(file, event);
                break;
            case "jpg": 
                this.handleImage(file, event);
                break;
            case "bmp": 
                this.handleImage(file, event);
                break;
            default:
                this.handleDefault(file, event);
                break;
        }
    }
}

let rp = new recentsProcessor({
    home: path.join(os.homedir(), '.refviewer'),
    filename: 'recent.json'
});

let sp = new settingsProcessor({
    home: path.join(os.homedir(), '.refviewer'),
    filename: 'config.json'
});

ipcMain.on('settings:write', (event, arg) => {
    //console.log("GOT SETTINGS!!", arg);

    sp.writeSettings(arg, () => {
        mainWindow.webContents.send('settings', sp.settings);
    });

    //HEREmainWindow.webContents.send('settings', );
    //event.reply('settings:all', sp.settings);
});

const fp = new fileProcessor();

let mainWindow;

try {
    require("electron-reloader")(module);
} catch (_) {}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on("ready", createWindow);
}

function createWindow() {
    mainWindow = new BrowserWindow({
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
    });

    /*550, 400*/ /*238*/

    mainWindow.loadFile("public/index.html");

    mainWindow.on("closed", function () {
        mainWindow = null;
    });

    mainWindow.webContents.on('did-finish-load', () => {
        sp = new settingsProcessor({
            home: path.join(os.homedir(), '.refviewer'),
            filename: 'config.json',
            ready: () => {
                mainWindow.webContents.send('settings', sp.settings);
            }
        });
    });

    ipcMain.on('window', (event, arg) => {
        if (!mainWindow) return;
        switch (arg) {
            case "pin":
                if (mainWindow.isAlwaysOnTop()) mainWindow.setAlwaysOnTop(false);
                else mainWindow.setAlwaysOnTop(true);
                event.reply('pin', mainWindow.isAlwaysOnTop());
                break;
            case "close":
                mainWindow.close();
                break;
            case "maximize":
                if (mainWindow.isMaximized()) mainWindow.unmaximize();
                else mainWindow.maximize();
                break;
            case "minimize":
                mainWindow.minimize();
                break;
            default: break;
        }
    });

    ipcMain.on('saveImage', (event, arg) => {
        dialog.showSaveDialog(mainWindow, {
            title: "Save image",
            defaultPath: "image.png"
        }).then(result => {
          console.log(result);
            let base64Data = arg
                                .replace(/^data:image\/png;base64,/, "")
                                .replace(/^data:image\/jpeg;base64,/, "");

            fs.writeFile(result.filePath, base64Data, 'base64', err => {
              if (err) {
                console.error(err);
              }
              // file written successfully
            });

        }).catch(err => {
          console.log(err);
        });
    });
}

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
    if (mainWindow === null) createWindow();
});

//path.join(home, "config.json")
//home = ;

ipcMain.on('file', (event, arg) => {
    //file processor

    fp.process(arg, event);
});

ipcMain.on('selectfile', (event, arg) => {
    dialog.showOpenDialog(mainWindow, {
        title: "Open image"
    }).then(result => {
        if (!result.cancelled && result.filePaths.length > 0) {
            let files = result.filePaths;


            fp.process(files[0], event);
        }
    }).catch(err => {
        console.log(err);
    });
});
/*
let sg = {
    "devmode" : true,
    "theme" : false
};

ipcMain.on('settings:get', (event, arg) => {
    //file processor

    if (arg == 'all') event.reply('settings:all', sg);
    else {

    }
});
*/