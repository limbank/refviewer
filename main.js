const { app, BrowserWindow,ipcMain } = require("electron");

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
        width: 238,
        height: 238,
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

    /*550, 400*/

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
}

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
    if (mainWindow === null) createWindow();
});

ipcMain.on('asynchronous-message', (event, arg) => {
  console.log(arg) // prints "ping"
  event.reply('asynchronous-reply', 'pong')
});