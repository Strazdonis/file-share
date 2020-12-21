const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const PROTOCOL_PREFIX = "fileshare";
const fs = require('fs-extra');
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
        minWidth:950,
        minHeight: 850,
        webPreferences: {
            nodeIntegration: true
        },
        show: false, //don't show at first
    });
    win.setMenuBarVisibility(false);

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
    
    server.connect_upl(arg.ip, arg.port, arg.filePath, arg.filePass, event);
});

ipcMain.on('download', (event, arg) => {
    console.log(arg);
    server.connect_dl(arg.ip, arg.port, arg.id, arg.pass, event);
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


ipcMain.on('save-file', (event, arg) => {

    const options = {
        title: 'Save file',
        buttonLabel: 'Save',
        defaultPath : arg.fileName,
        filters :[
            {name: arg.extension, extensions: [arg.extension]},
            {name: 'All Files', extensions: ['*']}
        ]
        //message: 'This message will only be shown on macOS'
    };

    dialog.showSaveDialog(null, options).then(filePath => {
        if (filePath.canceled) {
            return;
        }
        console.log(filePath);
        const content_buf = Buffer.from(arg.content);
        fs.outputFile(filePath.filePath, content_buf, err => {
            console.log(err); // => null
            if(!err) {
                event.sender.send('saved-file', filePath);
            } else {
                throw err;
            }
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


