const { app, BrowserWindow, ipcMain, dialog  } = require("electron");
const imageDataURI = require('image-data-uri');
const fs = require('fs');

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

class fileProcessor {
    handleDefault(path, event) {
        event.reply('deliver', path);
    }
    handleImage(path, event) {
        imageDataURI.encodeFromFile(path)
        .then(
            (response) => {
                event.reply('deliver', response);
            });
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

ipcMain.on('file', (event, arg) => {
    //file processor

    let file = fp.process(arg, event);
});

const fp = new fileProcessor();
let settings = {
    "devmode" : true,
    "theme" : false
};

ipcMain.on('settings:get', (event, arg) => {
    //file processor

    if (arg == 'all') event.reply('settings:all', settings);
    else {

    }
});