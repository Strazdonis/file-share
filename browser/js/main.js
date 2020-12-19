const { ipcRenderer } = require('electron');

//norint siust informacija is client i electron backend reikia naudoti ipcRenderer.send(event, data);
ipcRenderer.send('show-open-dialog');


//gauna informacija ateina kaip eventas
ipcRenderer.on('open-dialog-paths-selected', (event, data) => {
    console.log(data);

    //most likely a .txt file, they don't have a "type"
    if (data.fileType == undefined) {
        console.log(data.content);
        document.getElementsByClassName('preview')[0].innerHTML = data.content;
    }

    /**
     * 
     * 
     *          SET PREVIEW BACKGROUND USING CSS TO background-image:url('data.filePaths[0]') INSTEAD?
     * 
     * 
     */


    //based on https://stackoverflow.com/questions/38503181/how-to-display-a-jpg-image-from-a-node-js-buffer-uint8array
    else if (data.fileType.mime == 'image/jpeg') {
        var b64encoded = btoa(String.fromCharCode.apply(null, data.content));
        var datajpg = "data:image/jpg;base64," + b64encoded;
        // Create an HTML img tag
        var imageElem = document.createElement('img');
        // Just use the toString() method from your buffer instance
        // to get date as base64 type
        imageElem.src = datajpg;
        document.getElementsByClassName('preview')[0].appendChild(imageElem);
    }



    else if (data.fileType.mime == 'image/png') {
        //this doesnt work, "maximum call stack exceeded."

        // var b64encoded = btoa(String.fromCharCode.apply(null, data.content));
        // var datajpg = "data:image/png;base64," + b64encoded;
        // // Create an HTML img tag
        // var imageElem = document.createElement('img');
        // // Just use the toString() method from your buffer instance
        // // to get date as base64 type
        // imageElem.src = datajpg;
    }

});