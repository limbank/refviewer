const {app, BrowserWindow} = require('electron');
const path = require('path');

global.mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 550, 
    height: 400,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '/assets/img/icon-64x64.png')
  });

  mainWindow.setBackgroundColor('#111111');

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
