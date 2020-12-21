const net = require('net');
const fs = require('fs-extra');
const state = {
    "id": false,
    "confirm": false,
    "notif": false,
};

const CHUNK_SIZE = 10000000, // 10MB
    buffer = Buffer.alloc(CHUNK_SIZE);



function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

class BitConverter {
    GetBytes(int) {
        var b = new Buffer(8);
        b[0] = int;
        b[1] = int >> 8;
        b[2] = int >> 16;
        b[3] = int >> 24;
        return b;
    }
    ToInt(buffer) {
        return (buffer[0] | buffer[1] << 8 | buffer[2] << 16 | buffer[3] << 24) >>> 0;
    }
}

var converter = new BitConverter();


function arraysEqual(a1, a2) {
    /* WARNING: arrays must not contain {objects} or behavior may be undefined */
    return JSON.stringify(a1) == JSON.stringify(a2);
}

function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename);
    var fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

const START = new Uint8Array([11]);
/**
 * converts buffer to Uint8Array
 * @param {Buffer} buf buffer that will be encoded
 */
function encode(buf) {
    return Uint8Array.from(buf);
}

/**
 * Send file to server
 * @param {String} filePath path of the file that needs to be uploaded
 */
async function upload(filePath, filePass, client) {
    let file_size = getFilesizeInBytes(filePath);
    console.log("FILE size:", file_size, "file_name", filePath);
    const chunk_amount = Math.trunc(file_size / 256);
    console.log("chunks:", chunk_amount);
    let password;
    let password_len;
    if (filePass) {
        password = [...Buffer.from(filePass, 'utf8')];
        password_len = [...converter.GetBytes(password.length)].slice(0,4);
    } else {
        password = [];
        password_len = [0, 0, 0, 0];
    }

    console.log("PASSWORD BUFFER:", password, password_len, filePass);
    const split_path = filePath.replace(/\\/g, "/").split("/");
    const name_arr = split_path[split_path.length - 1];
    const name_len = name_arr.length;
    const name_buf = Buffer.from(name_arr, 'utf8');
    const size = new Uint8Array(21 + name_len + [...password].length);

    let converted_size = converter.GetBytes(file_size);
    size.set(
        [21 + [...password].length + name_len - 4,  //upcoming packet size
            0, 0, 0, 10, //Operand (upload start)
        ...converted_size, //file_size
        ...password_len, // password length
        ...password, //password (empty if none)
            name_len, 0, 0, 0, //name length
        ...name_buf], //name
        0); //offset

    console.log(size);

    let first_send = 1;

    client.write(size);
    fs.open(filePath, 'r', async function (err, fd) {

        if (err) {
            throw err;
        }
        async function readNextChunk() {
            //buffer[0] = 255;

            fs.read(fd, buffer, 0, CHUNK_SIZE, null, async function (err, nread) {
                if (err) {
                    throw err;
                }
                // i assume this needs to be +1 since im adding 255 to the start of first chunk
                if (first_send) {
                    nread += 1;
                } else {
                    return;
                }




                let data;
                if (nread < CHUNK_SIZE) {
                    //      console.log("MAZIAU");
                    let slice = buffer.slice(0, nread - first_send); //subtract the added 1 (L:56)
                    let upcoming_length = converter.GetBytes(slice.length + 1).slice(0, 4);
                    let upcoming_len = new Uint8Array([slice.length + 1, 0, 0, 0]);
                    console.log("THE UPCOMING LENGTH IS", upcoming_len);
                    if (first_send) {
                        data = encode(Buffer.concat([upcoming_length, START, slice]));
                    } else {
                        data = encode(slice);
                    }
                } else {
                    data = encode(Buffer.concat([START, buffer]));
                }
                console.log("sleeping...");
                await sleep(1200);
                if (state.confirm && state.id) {
                    console.log("SENDING", data);
                    client.write(data, err => {
                        if (err) {
                            throw err;
                        }
                    });


                    first_send -= 1;
                    readNextChunk();
                } else {
                    console.log(state, (state.confirm && state.id));
                    //no connection to server was made
                    client.destroy();
                }
            });

        }
        readNextChunk();

    });
}


/**
 * Download file from server
 * @param {String} id ID of the file that needs to be downloaded (LENGTH MUST BE 5)
 * @param {String} pass password of the file (optional)
 */
async function download(id, pass, client) {
    let password,password_len;
    if (pass) {
        password = [...Buffer.from(pass, 'utf8')];
        password_len = [...converter.GetBytes(password.length)].slice(0,4);
    } else {
        password = [];
        password_len = [0, 0, 0, 0];
    }
    const id_buf = Buffer.from(id, 'utf8');
    const size = new Uint8Array(14 + password_len.length);
    
    console.log(4, id_buf.length, password_len.length, password.length);


    console.log([14 + password.length - 4,  //upcoming packet size
        0, 0, 0, 20, //Operand (download request)
    ...id_buf, // file id
    ...password_len,
    ...password],);
    size.set(
        [14 + [...password].length - 4,  //upcoming packet size
            0, 0, 0, 20, //Operand (download request)
        ...id_buf, // file id
        ...password_len,
        ...password], //pass
        0); //offset

    console.log(size);
    client.write(size);
}


/**
 * Connect & upload file
 * @param {String} ip - server IP (taken from localStorage)
 * @param {String} port - server Port (taken from localStorage)
 * @param {String} filePath - filePath of the file that needs to be uploaded
 */
function connect_upl(ip, port, filePath, filePass, event) {
    var client = new net.Socket({ readable: true, writable: true });
    if (!ip || !port) {
        throw new Error("server ip and port is required.");
    }
    client.connect(port, ip, function () {
        upload(filePath, filePass, client);
    });

    client.on('data', async function (data) {
        //console.log(data[0]);
        const arr = [...data];
        const notif_array = [6, 0, 0, 0];
        const confirm_array = [10, 0, 0, 0];
        const reject_array = [0, 0, 0, 0, 0];
        if (arraysEqual(arr, notif_array)) {
            state.notif = true;
        } else if (arraysEqual(arr, confirm_array)) {
            state.confirm = true;
        } else if (arraysEqual(arr, reject_array)) {
            console.log("REJECTED");
        } else if(arr.length >= 5) {
            //sometimes the data gets added up to one chunk ([120,97,75,81,106] gets [10] added at the front.)
            if (arr[0] == 10) {
                state.confirm = true;
                arr.shift(); //remove first elemnt
                state.id = data.slice(1).toString();
            } else {
                state.id = data.toString();
            }

        } else if(arr[0] == 11) {
            event.sender.send('uploaded-file', {id: state.id});
        }
        console.log('Received: ' + data, arr);
        console.log(state);
    });

    client.on('close', function () {
        console.log('Connection closed');
        client.destroy();
    });

    client.on('error', function (err) {
        console.log('Connection threw an error', err);
    });

}



/**
 * Connect & upload file
 * @param {String} ip - server IP (taken from localStorage)
 * @param {String} port - server Port (taken from localStorage)
 * @param {String} id - id of the file that needs downloading
 * @param {String} filePass - password of the file (optional)
 */
function connect_dl(ip, port, id, filePass = null, event) {
    var client = new net.Socket({ readable: true, writable: true });
    if (!ip || !port) {
        throw new Error("server ip and port is required.");
    }
    client.connect(port, ip, function () {
        download(id, filePass, client);
    });

    let receiving = false;

    let full_file = [];
    let name_readable;
    let extension;
    let total_size;
    let sent = false;

    client.on('data', async function (data) {
        const finished_arr = [9, 0, 0, 0];
        const finished_arr_merged = [9, 0, 0, 0, 0, 73,
            110, 97, 99, 116, 105, 118,
            101];
        console.log([...data]);
        if (data[0] == 20) {
            if(data[1] == 1) {
                //wrong password
                event.sender.send('error', {message: "Wrong password"});
                return client.destroy();
            }
            if(data[1] == 2) {
                //no such file
                event.sender.send('error', {message: "File does not exist"});
                return client.destroy();
            }
            receiving = true;
            const name_length = data[10];
            const response = [...data];
            const name = response.slice(14, 14 + name_length);
            const content = response.slice(19 + name_length);
            total_size = converter.ToInt(response.slice(2, 10));
            full_file.push(...content);
            name_readable = name.map(r => String.fromCharCode(r)).join("");
            const split_name = name_readable.split(".");
            extension = split_name[split_name.length - 1];

            console.log("NAME:", name_readable);
            if (extension == "txt") {
                console.log("CONTENT:", content.map(r => String.fromCharCode(r)));
            }

        } else if (receiving) {
            console.log("pushed to full_file");
            full_file.push(...data);
            console.log(full_file.length, total_size);
            if (full_file.length >= total_size) {
                console.log("FULLY DOWNLOADED");
                
                event.sender.send('downloaded-file', { extension, name: name_readable, content: full_file });
                receiving = false;
                sent = true;
                client.destroy();
            }
        }

    });


    client.on('close', function () {
        console.log('Connection closed');
        client.destroy();
    });

    client.on('error', function (err) {
        console.log('Connection threw an error', err);
        client.destroy();
    });

}


module.exports = {
    connect_upl,
    connect_dl,
    upload
};