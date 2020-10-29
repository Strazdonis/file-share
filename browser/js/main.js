const {ipcRenderer} = require('electron');

//norint siust informacija is client i electron backend reikia naudoti ipcRenderer.send(event, data);
ipcRenderer.send('show-open-dialog');


//gauna informacija ateina kaip eventas
ipcRenderer.on('open-dialog-paths-selected', (event, data) => {
    console.log(data);
});