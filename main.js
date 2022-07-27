const { app, BrowserWindow, ipcMain, dialog, screen, shell } = require("electron");

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const imageDataURI = require('image-data-uri');
const screenshot = require('screenshot-desktop');
const Jimp = require('jimp');
const PSD = require('psd');
const Vibrant = require('node-vibrant');
const sharp = require('sharp');

let mainWindow, newWin;
let sp, rp;
let generatedPalette;
let processorsReady = false;

const supportedExtensions = ['img', 'png', 'bmp', 'gif', 'jpeg', 'jpg', 'psd', 'tif', 'tiff', 'dng', 'webp'];

function dataToBuffer(dataURI) {
    return new Buffer(dataURI.split(",")[1], 'base64');
}

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
    handleDefault(filePath, event) {
        if (filePath.startsWith("http")) this.handleImage(filePath, event);
        else event.sender.send('deliver', filePath);
    }
    handleImage(filePath, event) {
        rp.writeRecent(filePath, (recents) => {
            event.sender.send('recents', recents);
        });

        if (filePath.startsWith("http")) {
            imageDataURI.encodeFromURL(filePath)
            .then(
                (response) => {
                    event.sender.send('deliver', response);
                });
        }
        else {
            imageDataURI.encodeFromFile(filePath)
            .then((response) => {
                event.sender.send('deliver', response);
            })
            .catch((error) => {
                event.sender.send('action', "Error loading file!");
            });
        }
    }
    handleConversion (filePath, event) {
        rp.writeRecent(filePath, (recents) => {
            event.sender.send('recents', recents);
        });

        sharp(filePath)
            .png()
            .toBuffer()
            .then( data => {
                event.sender.send('deliver', `data:image/png;base64,${data.toString('base64')}`);
            })
            .catch( err => {
                console.log(err);
            });
    }
    handlePSD (filePath, event) {
        rp.writeRecent(filePath, (recents) => {
            event.sender.send('recents', recents);
        });

        let psdPath = path.join(os.tmpdir(), 'out.png');

        PSD.open(filePath).then(function (psd) {
            return psd.image.saveAsPng(psdPath);
        }).then(() => {
            imageDataURI.encodeFromFile(psdPath)
            .then(
                (response) => {
                    event.sender.send('deliver', response);
                });
        });
    }
    handleTIFF (filePath, event) {
        let senderID = event.sender.id;
        let activeWindow = wm.getWindowByID(senderID);
        
        if (!activeWindow) return;
        rp.writeRecent(filePath, (recents) => {
            event.sender.send('recents', recents);
        });

        Jimp.read(filePath, (err, image) => {
          if (err) throw err;
          else {
            image
            .getBase64(Jimp.MIME_JPEG, function (err, src) {
                //bakchere

                fp.process(src, event);
                activeWindow.show();
            });
          }
        });
    }
    process(file, event) {
        let ext = file.substr(file.lastIndexOf(".") + 1).toLowerCase();

        generatedPalette = null;

        switch(ext) {
            case "psd": 
                this.handlePSD(file, event);
                break;
            case "tif":
                this.handleTIFF(file, event);
                break;
            case "tiff":
                this.handleTIFF(file, event);
                break;
            case "dng":
                this.handleTIFF(file, event);
                break;
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
            case "webp": 
                this.handleConversion(file, event);
                break;
            case "gif": 
                this.handleConversion(file, event);
                break;
            default:
                this.handleDefault(file, event);
                break;
        }
    }
}

class windowManager {
    constructor () {
        this.windows = [];
    }
    waitForProcessors(callback) {
        let interval = setInterval(() => {
            if (processorsReady) {
                clearInterval(interval);

                if (callback && typeof callback == "function") callback();
            }
        }, 100);
    }
    createWindow() {
        this.waitForProcessors(() => {
            console.log("CREATING WINDOW!!");

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
                console.log("WINDOW CLOSED!");
                this.windows.splice(this.windows.indexOf(w), 1);
                w = null;
            });

            w.webContents.on('will-navigate', function (e, url) {
                e.preventDefault();
                shell.openExternal(url);
            });

            w.webContents.on('did-finish-load', () => {
                w.webContents.send('settings', sp.settings);
                w.webContents.send('recents', rp.recents);
            });
        });
    }
    getWindowByID(id) {
        for (var i = 0; i < this.windows.length; i++) {
            if (this.windows[i].id == id) return this.windows[i];
        }

        return false;
    }
}

const fp = new fileProcessor();
const wm = new windowManager();

let gotTheLock;

sp = new settingsProcessor({
    home: path.join(os.homedir(), '.refviewer'),
    filename: 'config.json',
    ready: () => {
        rp = new recentsProcessor({
            home: path.join(os.homedir(), '.refviewer'),
            filename: 'recents.json',
            ready: () => {
                processorsReady = true;
            }
        });
    }
});

try {
    require("electron-reloader")(module);
} catch (_) {}

gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on("ready", () => {
        wm.createWindow();
    });
}

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
    if (wm.windows.length <= 0) wm.createWindow();
});    

ipcMain.on('settings:write', (event, arg) => {
    sp.writeSettings(arg, () => {
        event.sender.send('settings', sp.settings);
    });
});

ipcMain.on('window', (event, arg) => {
    //console.log("GOT A WINDOW MESSAGE!");
    let senderID = event.sender.id;
    let activeWindow = wm.getWindowByID(senderID);
    //console.log("SENDER ID!", senderID);
    if (!activeWindow) return;
    //console.log("WINDOW FOUND!", activeWindow.id);
    switch (arg) {
        case "pin":
            if (activeWindow.isAlwaysOnTop()) activeWindow.setAlwaysOnTop(false);
            else activeWindow.setAlwaysOnTop(true);
            event.sender.send('pin', activeWindow.isAlwaysOnTop());
            break;
        case "close":
            activeWindow.close();
            break;
        case "maximize":
            if (activeWindow.isMaximized()) activeWindow.unmaximize();
            else activeWindow.maximize();
            break;
        case "minimize":
            activeWindow.minimize();
            break;
        case "new":
            wm.createWindow();
            break;
        default: break;
    }
});

ipcMain.on('saveImage', (event, arg) => {
    let senderID = event.sender.id;
    let activeWindow = wm.getWindowByID(senderID);

    if (!activeWindow) return;
    dialog.showSaveDialog(activeWindow, {
        title: "Save image",
        defaultPath: "image.png"
    }).then(result => {
        let base64Data = arg
                            .replace(/^data:image\/png;base64,/, "")
                            .replace(/^data:image\/jpeg;base64,/, "");

        fs.writeFile(result.filePath, base64Data, 'base64', err => {
            if (err) console.error(err);

            event.sender.send('action', "Image saved!");
        });

    }).catch(err => {
      console.log(err);
    });
});

ipcMain.on('flipImage', (event, arg) => {
    let senderID = event.sender.id;
    let activeWindow = wm.getWindowByID(senderID);
    
    if (!activeWindow) return;
    Jimp.read(dataToBuffer(arg), (err, image) => {
      if (err) throw err;
      else {
        image.mirror(true, false)
        .getBase64(Jimp.MIME_JPEG, function (err, src) {
            //bakchere

            fp.process(src, event);
            activeWindow.show();
        });
      }
    });
});

ipcMain.on('rotateImage', (event, arg) => {
    let senderID = event.sender.id;
    let activeWindow = wm.getWindowByID(senderID);
    
    if (!activeWindow) return;
    Jimp.read(dataToBuffer(arg), (err, image) => {
      if (err) throw err;
      else {
        image.rotate(-90)
        .getBase64(Jimp.MIME_JPEG, function (err, src) {
            //bakchere

            fp.process(src, event);
            activeWindow.show();
        });
      }
    });
});

ipcMain.on('file', (event, arg) => {
    fp.process(arg, event);
    if (newWin) newWin.close();
});

ipcMain.on('action', (event, arg) => {
    event.sender.send('action', arg);
});

ipcMain.on('getPalette', (event, arg) => {
    if (generatedPalette) return event.sender.send('palette', generatedPalette);

    let filePath = path.join(os.tmpdir(), 'out.png');
    let base64Data = arg
                            .replace(/^data:image\/png;base64,/, "")
                            .replace(/^data:image\/jpeg;base64,/, "");

    fs.writeFile(filePath, base64Data, 'base64', err => {
        if (err) {
            console.error(err);
        }

        Vibrant.from(filePath).getPalette().then((palette) => {
            generatedPalette = palette;

            event.sender.send('palette', generatedPalette);
        });
    });
});
/*
ipcMain.on('recents:add', (event, arg) => {
    rp.writeRecent(arg, (recents) => {
        event.sender.send("recents", recents);
    });
});
*/

ipcMain.on('selectfile', (event, arg) => {
    let senderID = event.sender.id;
    let activeWindow = wm.getWindowByID(senderID);
    
    if (!activeWindow) return;
    dialog.showOpenDialog(activeWindow, {
        title: "Open image",
        filters: [{ name: 'Images', extensions: supportedExtensions }]
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
    let senderID = event.sender.id;
    let activeWindow = wm.getWindowByID(senderID);
    
    if (!activeWindow) return;
    let windowPOS = activeWindow.getPosition();

    let currentScreen = screen.getDisplayNearestPoint({
        x: windowPOS[0],
        y: windowPOS[1]
    });

    let allDisplays = screen.getAllDisplays();
    let index = allDisplays.map(e => e.id).indexOf(currentScreen.id);;
    activeWindow.hide();

    screenshot.listDisplays().then((displays) => {

        screenshot({
            screen: displays[index].id,
            filename: path.join(os.tmpdir(), 'screenshot.png')
        }).then((imgPath) => {
            impath = imgPath;

            activeWindow.show();
            
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

                ipcMain.once('image_crop', (e, arg) => {
                    if (newWin) newWin.close();

                    Jimp.read(impath, (err, image) => {
                      if (err) throw err;
                      else {
                        image.crop(arg.x, arg.y, arg.w, arg.h)
                        .quality(100)
                        .getBase64(Jimp.MIME_JPEG, function (err, src) {
                            //bakchere

                            fp.process(src, event);
                            activeWindow.show();
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