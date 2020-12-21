const { ipcRenderer } = require('electron');
const storage = window.localStorage;
if (!storage.getItem('ip')) {
    storage.setItem('ip', '206.189.58.160');
}
if (!storage.getItem('port')) {
    storage.setItem('port', '55755');
}


//norint siust informacija is client i electron backend reikia naudoti ipcRenderer.send(event, data);
// ipcRenderer.send('show-open-dialog');

document.getElementById("upl_pass").addEventListener('click', e => {
    e.stopPropagation();
});

document.getElementById("upload-card").addEventListener('click', e => {
    e.stopPropagation();
    ipcRenderer.send('show-open-dialog');
});

document.getElementById("download_form").addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById("dl_id").value;
    const pass = document.getElementById("dl_pass").value || null;
    if (id.length != 5) {
        swal({
            title: "Error",
            text: "ID must be 5 characters long!",
            icon: "error",
        });
        return;
    }
    ipcRenderer.send('download', {
        ip: localStorage.getItem('ip'),
        port: localStorage.getItem('port'),
        id: id,
        pass: pass,
    });
});

// const el = document.createElement("div");
// el.classList.add("preview_element");
// document.getElementsByClassName('preview')[0].appendChild(el)

ipcRenderer.on('file-content', (event, data) => {
    console.log(data);
    const previewParent = document.getElementsByClassName('preview')[0];
    previewParent.innerHTML = data;
});

ipcRenderer.on('uploaded-file', (event,data) => {
    swal({
        title: "Uploaded",
        text: `File ID: ${data.id}`,
        icon: "success",
    });
    document.getElementsByClassName('preview')[0].innerHTML = `<p class="preview_text">File ID: ${data.id}</p>`;
});

ipcRenderer.on('error', (event, data) => {
    swal({
        title: "Error",
        text: data.message,
        icon: "error",
    });
    return;
});

ipcRenderer.on('downloaded-file', (event, data) => {
    console.log(data);
    ipcRenderer.send('save-file', {
        extension: data.extension,
        fileName: data.name,
        content: data.content,
    });
});

function processFile(filePath, fileType, content) {
    const path = filePath.replaceAll("\\", "/");
    /* jshint: ignoreline*/
    const mime = fileType?.mime || fileType;
    const previewParent = document.getElementsByClassName('preview')[0];
    previewParent.innerHTML = "";
    previewParent.style['background-image'] = ``;
    //most likely a .txt file, they don't have a "type"
    if (fileType == undefined || mime.includes("text")) {
        if (content) {
            console.log(content);
            previewParent.innerHTML = content;
        } else {
            ipcRenderer.send('fetch-content', path);
        }

    }
    //image file (.png, .jpeg, .gif)
    else if (mime.includes("image")) {
        previewParent.style['background-image'] = `url("${path}")`;
    }


    const upload_btn = document.getElementById("upload_btn");
    upload_btn.style.display = "block";

    upload_btn.addEventListener('click', ev => {
        previewParent.innerHTML = "";
        previewParent.style['background-image'] = ``;
        const filePass = document.getElementById("upl_pass").value || null;
        ipcRenderer.send('upload',
            { filePath: path, filePass, content, ip: localStorage.getItem('ip'), port: localStorage.getItem('port') }
        );
    });
}

//gauna informacija ateina kaip eventas
ipcRenderer.on('open-dialog-paths-selected', (event, data) => {
    console.log(data);
    processFile(data.filePaths[0], data.fileType, data.content);
});

document.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files[0];
    console.log("Dropped file:", file);
    if (file === undefined) {
        return;
    }
    processFile(file.path, file.type, file.contents);

});
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('dragenter', (event) => {
    console.log('File is in the Drop Space');
});

document.addEventListener('dragleave', (event) => {
    console.log('File has left the Drop Space');
});