const { ipcRenderer } = require('electron');

//norint siust informacija is client i electron backend reikia naudoti ipcRenderer.send(event, data);
// ipcRenderer.send('show-open-dialog');

document.getElementById("upload-card").addEventListener('click', e => {
    ipcRenderer.send('show-open-dialog');
});


// const el = document.createElement("div");
// el.classList.add("preview_element");
// document.getElementsByClassName('preview')[0].appendChild(el)


//gauna informacija ateina kaip eventas
ipcRenderer.on('open-dialog-paths-selected', (event, data) => {
    console.log(data);
    const path = data.filePaths[0].replaceAll("\\", "/");
    //most likely a .txt file, they don't have a "type"
    if (data.fileType == undefined) {
        console.log(data.content);
        document.getElementsByClassName('preview')[0].innerHTML = data.content;
    }
    //image file (.png, .jpeg, .gif)
    else if (data.fileType.mime.includes("image")) {
        document.getElementsByClassName('preview')[0].style.background = `url("${path}")`;
    }


    document.getElementById("submit_btn").style.display = "block";
});