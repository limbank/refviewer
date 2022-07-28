const { app, BrowserWindow, ipcMain, dialog, screen, shell } = require("electron");

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const imageDataURI = require('image-data-uri');
const screenshot = require('screenshot-desktop');
const PSD = require('psd');
const Vibrant = require('node-vibrant');
const sharp = require('sharp');
const fileFilter = require('./src/scripts/fileFilter.js')
const recentsProcessor = require('./src/scripts/recentsProcessor.js')
const settingsProcessor = require('./src/scripts/settingsProcessor.js')

let mainWindow, newWin;
let sp, rp;
let generatedPalette;
let processorsReady = false;

function dataToBuffer(dataURI) {
    return new Buffer(dataURI.split(",")[1], 'base64');
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
    process(file, event) {
        let ext = file.substr(file.lastIndexOf(".") + 1).toLowerCase();

        generatedPalette = null;

        switch(ext) {
            case "psd": 
                this.handlePSD(file, event);
                break;
            case "tif":
                this.handleConversion(file, event);
                break;
            case "tiff":
                this.handleConversion(file, event);
                break;
            case "dng":
                this.handleConversion(file, event);
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
        defaultPath: "image",
        filters: fileFilter.save
    }).then(result => {
        let filePath = result.filePath;
        var ext = filePath.substr(filePath.lastIndexOf(".") + 1);

        sharp(dataToBuffer(arg))
            .toFormat(ext)
            .toFile(filePath)
            .then(info => {
                //console.log("info", info);
                event.sender.send('action', "Image saved!");
            })
            .catch( err => {
                console.log(err);
                event.sender.send('action', "Failed to save image");
            });
    }).catch(err => {
      console.log(err);
    });
});

ipcMain.on('flipImage', (event, arg) => {
    let senderID = event.sender.id;
    let activeWindow = wm.getWindowByID(senderID);
    
    if (!activeWindow) return;

    sharp(dataToBuffer(arg))
        .flip()
        .toBuffer()
        .then(data => {
            fp.process(`data:image/png;base64,${data.toString('base64')}`, event);
            activeWindow.show();
        })
        .catch( err => {
            console.log(err);
        });
});

ipcMain.on('rotateImage', (event, arg) => {
    let senderID = event.sender.id;
    let activeWindow = wm.getWindowByID(senderID);
    
    if (!activeWindow) return;

    sharp(dataToBuffer(arg))
        .rotate(90)
        .toBuffer()
        .then(data => {
            fp.process(`data:image/png;base64,${data.toString('base64')}`, event);
            activeWindow.show();
        })
        .catch( err => {
            console.log(err);
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
        filters: fileFilter.open
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

                    sharp(impath)
                        .extract({ left: arg.x, top: arg.y, width: arg.w, height: arg.h })
                        .toBuffer()
                        .then( data => {
                            fp.process(`data:image/png;base64,${data.toString('base64')}`, event);
                            activeWindow.show();
                        })
                        .catch( err => {
                            console.log(err);
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