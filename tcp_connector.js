const net = require('net');
const fs = require('fs');
const readline = require('readline');
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
var state = {
    "id": false,
    "confirm": false,
    "notif": false,
};
var client = new net.Socket({ readable: true, writable: true });
const CHUNK_SIZE = 10000000, // 10MB
    buffer = Buffer.alloc(CHUNK_SIZE);

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename);
    var fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

const START = new Uint8Array([11]);
function encode(buf) {
    return Uint8Array.from(buf);
}

function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i+=1) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}


async function sendFile(client) {
    const filePath = await askQuestion("File to send:");
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
                // const encoded = new Uint8Array(str2ab("test"));
                // data = new Uint8Array(encoded.length + 1);
                // data.set([11]);
                // data.set(encoded, 1);
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
 * Download file from server
 * @param {String} id ID of the file that needs to be downloaded (LENGTH MUST BE 5)
 * @param {String} pass password of the file (optional)
 */
async function download(id, pass) {
    let pass_buf = [0,0,0,0];
    if(pass != null) {
        pass_buf = [...Buffer.from(pass, 'utf8')];
    }
    const id_buf = Buffer.from(id, 'utf8');
    const size = new Uint8Array(10+pass_buf.length);
    console.log("ID", id, [...id_buf]);
    console.log("PASS", pass, pass_buf);
    size.set(
        [10+pass_buf.length - 4,  //upcoming packet size
        0, 0, 0, 20, //Operand (download request)
        ...id_buf, // file id
        ...pass_buf], //name
        0); //offset

    console.log(size);
    client.write(size);
}


function arraysEqual(a1, a2) {
    /* WARNING: arrays must not contain {objects} or behavior may be undefined */
    return JSON.stringify(a1) == JSON.stringify(a2);
}


async function init() {
    let answer = await askQuestion(`Enter Server IP Address 
(or enter "a" to connect to "127.0.0.1:55755" or "b" to connect to "206.189.58.160:55755"):`);
    console.log("ATSAKE", answer);
    let ip, port = "55755";
    if (answer === "a") {
        ip = "127.0.0.1";
    } else if (answer === "b") {
        ip = "206.189.58.160";
    } else {
        ip = answer.split[":"][0];
        port = answer.split[":"][1] || "55755";
    }
    console.log("Attempting to connect...");
    client.connect(port, ip, function () {
        download("Tj40B", null);
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
        init();
    });

    client.on('error', function (err) {
        console.log('Connection threw an error', err);
    });
}

init();
