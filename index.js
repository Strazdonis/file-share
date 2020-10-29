const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const PROTOCOL_PREFIX = "fileshare";

var proto = require('register-protocol-win32');

// ONLY WORKS IN WINDOWS
/**
 * LINUX / MAC OS https://stackoverflow.com/questions/18534591/how-to-register-a-url-protocol-handler-in-node-js
 */
proto.exists(PROTOCOL_PREFIX)
    .then(function (exists) {
        console.log(exists ? "protocol already exists" : "protocol doesnt exist, attempting to define");
        if (!exists) {
            proto.install('fileshare', `"${process.cwd()}\\file_share.exe" "%1"`)
                .then(function () {
                    console.log("successfully defined protocol :)");
                })
                .catch(function (err) {
                    console.log("ERROR DEFINING PROTOCOL", err);
                });
        }
    })
    .catch(function (err) {
        console.log("ERROR CHECKING IF PROTOCOL EXISTS", err);
    });


console.log(process.argv);
function createWindow() {
    console.log("createwindow called");
    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: true
        },
        show: false //don't show at first
    });

    win.loadFile('index.html');

    win.once('ready-to-show', () => {
        win.show(); //one ready - show
    });

    //      ONLY WORKS IN-APP, WHEN APP IS LAUNCHED.
    //     protocol.registerHttpProtocol(PROTOCOL_PREFIX, (req, cb) => {
    //         const fullUrl = req.url;
    //         console.log('full url to open ' + fullUrl)
    // //        mainWindow.loadURL(fullUrl)
    //     });

    // win.webContents.openDevTools();
}

ipcMain.on('show-open-dialog', (event, arg) => {

    const options = {
        title: 'Open a file or folder',
        buttonLabel: 'Upload',
        /*filters: [
          { name: 'xml', extensions: ['xml'] }
        ],*/
        properties: ['showHiddenFiles'],
        //message: 'This message will only be shown on macOS'
    };

    dialog.showOpenDialog(null, options, (filePaths) => {
        
    }).then(filePaths => {
        event.sender.send('open-dialog-paths-selected', filePaths);
    });
});


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});


