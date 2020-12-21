const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const PROTOCOL_PREFIX = "fileshare";
const fs = require('fs');
var proto = require('register-protocol-win32');
const FileType = require('file-type');
const server = require('./server_connector');

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

ipcMain.on('upload', (event, arg) => {
    console.log(arg);
    server.connect(arg.ip, arg.port, arg.filePath);
});

ipcMain.on('fetch-content', (event, arg) => {
    fs.readFile(arg, 'utf-8', (err, data) => {
        if (err) {
            throw err;
        }
        console.log(data);
        event.sender.send('file-content', data);
    });
});

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

    }).then(async filePaths => {
        if (filePaths.canceled) {
            return;
        }


        filePaths.fileType = await FileType.fromFile(filePaths.filePaths[0]);
        const encoding = filePaths.fileType === undefined ? "utf8" : '';
        console.log(filePaths.fileType, encoding);
        fs.readFile(filePaths.filePaths[0], encoding, function (err, data) {
            if (err) {
                filePaths.error = err;
                return event.sender.send('open-dialog-paths-selected', filePaths);
            }
            filePaths.content = data;
            event.sender.send('open-dialog-paths-selected', filePaths);
        });


        // event.sender.send('open-dialog-paths-selected', filePaths);
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


