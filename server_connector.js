const net = require('net');
const fs = require('fs');
const state = {
    "id": false,
    "confirm": false,
    "notif": false,
};

const CHUNK_SIZE = 10000000, // 10MB
    buffer = Buffer.alloc(CHUNK_SIZE);

var client = new net.Socket({ readable: true, writable: true });

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

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
async function upload(filePath) {
    let file_size = getFilesizeInBytes(filePath);
    console.log("FILE size:", file_size, "file_name", filePath);
    const chunk_amount = Math.trunc(file_size / 256);
    console.log("chunks:", chunk_amount);
    const split_path = filePath.replace(/\\/g, "/").split("/");
    const name_arr = split_path[split_path.length - 1];
    const name_len = name_arr.length;
    const name_buf = Buffer.from(name_arr, 'utf8');
    console.log(split_path, name_arr, name_len, name_buf);
    const size = new Uint8Array(21+name_len);

    size.set(
        [21+name_len - 4,  //upcoming packet size
        0, 0, 0, 10, //Operand (upload start)
        file_size, 0, 0, 0, 0, 0, 0, 0, // file size
        0, 0, 0, 0, // password
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
                // i assume this needs to be +1 since im adding 255 to the start of first chunk
                if (first_send) {
                    nread += 1;
                }
                //  console.log("NR:", nread);
                if (err) {
                    throw err;
                }

                if (nread === chunk_amount) {
                    // done reading file, do any necessary finalization steps

                    fs.close(fd, function (err) {
                        if (err) {
                            throw err;
                        }
                    });
                    return;
                }

                let data;
                if (nread < CHUNK_SIZE) {
                    //      console.log("MAZIAU");
                    let slice = buffer.slice(0, nread - first_send); //subtract the added 1 (L:56)
                    let upcoming_len = new Uint8Array([slice.length + 1, 0, 0, 0]);
                    if (first_send) {
                        data = encode(Buffer.concat([upcoming_len, START, slice]));
                    } else {
                        data = encode(slice);
                    }

                }

                else {
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
                    process.exit();
                }
            });

        }
        readNextChunk();

    });
}

/**
 * Connect & upload file
 * @param {String} ip - server IP (taken from localStorage)
 * @param {String} port - server Port (taken from localStorage)
 * @param {String} filePath - filePath of the file that needs to be uploaded
 */
function connect_upl(ip, port, filePath) {
    if (!ip || !port) {
        throw new Error("server ip and port is required.");
    }
    client.connect(port, ip, function () {
        upload(filePath);
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
            process.exit();
        } else {
            //sometimes the data gets added up to one chunk ([120,97,75,81,106] gets [10] added at the front.)
            if (arr[0] == 10) {
                state.confirm = true;
                arr.shift(); //remove first elemnt
                state.id = data.slice(1).toString();
            } else {
                state.id = data.toString();
            }

        }
        console.log('Received: ' + data, arr);
        console.log(state);
    });

    client.on('message', function (data) {
        console.log("MESSAGE", data);
    });

    client.on('close', function () {
        console.log('Connection closed');
    });

    client.on('error', function (err) {
        console.log('Connection threw an error', err);
    });

}

module.exports = {
    connect_upl,
    upload
};