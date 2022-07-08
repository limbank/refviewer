const { app, BrowserWindow, ipcMain, dialog, screen   } = require("electron");

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const imageDataURI = require('image-data-uri');
const screenshot = require('screenshot-desktop');
const Jimp = require('jimp');

let mainWindow, newWin;
let sp, rp;

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
    writeRecent(item, callback) {
        if (!item) return;

        //get item in array and if it exists, move it to the front 
        let index = this.recents.indexOf(item);

        if (index >= 0) {
            var [itemToMove] = this.recents.splice(index, 1);
            this.recents.unshift(itemToMove);
        }
        else this.recents.unshift(item);

        if (this.recents.length > 10) this.recents = this.recents.slice(0, 10);

        fs.writeJson(this.file, this.recents, err => {
            if (err) return console.error(err);

            if (callback && typeof callback == "function") callback(this.recents);
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
        if (path.startsWith("http")) this.handleImage(path, event);
        else {
            console.log("hit default, returning: ", path);
            mainWindow.webContents.send('deliver', path);
        }
    }
    handleImage(path, event) {
        rp.writeRecent(path, (recents) => {
            mainWindow.webContents.send('recents', recents);
        });

        if (path.startsWith("http")) {
            imageDataURI.encodeFromURL(path)
            .then(
                (response) => {
                    mainWindow.webContents.send('deliver', response);
                });
        }
        else {
            imageDataURI.encodeFromFile(path)
            .then(
                (response) => {
                    mainWindow.webContents.send('deliver', response);
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

//should i be redeclaring it like this??
/*
let sp = new settingsProcessor({
    home: path.join(os.homedir(), '.refviewer'),
    filename: 'config.json'
});
let rp = new recentsProcessor({
    home: path.join(os.homedir(), '.refviewer'),
    filename: 'recent.json'
});
*/

ipcMain.on('settings:write', (event, arg) => {
    //console.log("GOT SETTINGS!!", arg);

    sp.writeSettings(arg, () => {
        mainWindow.webContents.send('settings', sp.settings);
    });

    //HEREmainWindow.webContents.send('settings', );
    //event.reply('settings:all', sp.settings);
});

const fp = new fileProcessor();

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

        rp = new recentsProcessor({
            home: path.join(os.homedir(), '.refviewer'),
            filename: 'recents.json',
            ready: () => {
                mainWindow.webContents.send('recents', rp.recents);
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
    fp.process(arg);
    if (newWin) newWin.close();
});

/*
ipcMain.on('recents:add', (event, arg) => {
    rp.writeRecent(arg, (recents) => {
        event.reply("recents", recents);
    });
});
*/

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

ipcMain.on('screenshot', (event, arg) => {
    let windowPOS = mainWindow.getPosition();

    let currentScreen = screen.getDisplayNearestPoint({
        x: windowPOS[0],
        y: windowPOS[1]
    });

    let allDisplays = screen.getAllDisplays();
    let index = allDisplays.map(e => e.id).indexOf(currentScreen.id);;
    mainWindow.hide();

    screenshot.listDisplays().then((displays) => {

        screenshot({
            screen: displays[index].id,
            filename: path.join(os.tmpdir(), 'screenshot.png')
        }).then((imgPath) => {
            impath = imgPath;

            mainWindow.show();
            
            newWin = new BrowserWindow({
                x: currentScreen.bounds.x,
                y: currentScreen.bounds.y,
                width: currentScreen.size.width,
                height: currentScreen.size.height,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                },
                frame:false,
                show: false
            });

            newWin.loadFile('public/screen.html');

            newWin.once('ready-to-show', () => {
                newWin.show();
                newWin.setFullScreen(true);
                newWin.focus();

                ipcMain.on('image_crop', (e, arg) => {
                    if (newWin) newWin.close();

                    Jimp.read(impath, (err, image) => {
                      if (err) throw err;
                      else {
                        image.crop(arg.x, arg.y, arg.w, arg.h)
                        .quality(100)
                        .getBase64(Jimp.MIME_JPEG, function (err, src) {
                            //bakchere

                            fp.process(src);
                            mainWindow.show();
                        });
                      }
                    });
                });
            });

            newWin.on('close', function(e){
                newWin = null;
            });
        }).catch((error) => {
            console.log("error", error)
        });
    });
});