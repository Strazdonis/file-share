const net = require('net');
const fs = require('fs');

const CHUNK_SIZE = 10000000, // 10MB
    buffer = Buffer.alloc(CHUNK_SIZE);

var client = new net.Socket({ readable: true, writable: true });

function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename);
    var fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

const START = new Uint8Array([11]);
function encode(buf) {
    return Uint8Array.from(buf);
}
// OP, file length,     passwd,  fileName 
//[10, 0,0,0,0,0,0,0,4, 0,0,0,0, 234,123,213,123]
function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}


async function upload(filePath) {
    let file_size = getFilesizeInBytes(filePath);
    console.log("FILE size:", file_size);
    // file_size += 1; //add up for '255' in the beggining of first chunk
    const chunk_amount = Math.trunc(file_size / 256);
    console.log("chunks:", chunk_amount);

    const split = filePath.split("/");
    const file_name = split[split.length - 1];
    const file_name_enc = str2ab(file_name);
    let notification =  new Uint8Array([10, 0, 0, 0, 0, 0, 0, 0, file_size, 0, 0, 0, 0, 123, 123, 123, 123]);

    console.log("SENDING", notification);

    let first_send = 1;

    //"notify" the server about the upcoming file.
    client.write(notification);
    fs.open(filePath, 'r', function (err, fd) {

        if (err) {
            throw err;
        }
        function readNextChunk() {
            //buffer[0] = 255;

            fs.read(fd, buffer, 0, CHUNK_SIZE, null, function (err, nread) {
                // i assume this needs to be +1 since im adding 255 to the start of first chunk
                if (first_send) {
                    nread += 1;
                }
                console.log("NR:", nread);
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
                    return true;
                }

                let data;
                if (nread < CHUNK_SIZE) {
                    let slice = buffer.slice(0, nread - first_send); //subtract the added 1 (L:56)

                    if (first_send) {
                        data = encode(Buffer.concat([START, slice]));
                    } else {
                        data = encode(slice);
                    }

                }

                else {
                    data = encode(Buffer.concat([START, buffer]));
                }
                console.log("SENDING", data.join("."));

                client.write(data, err => {
                    if (err) {
                        throw err;
                    }
                });


                first_send -= 1;
                readNextChunk();
            });

        }
        readNextChunk();

    });

}

function connect(ip, port, filePath) {
    if (!ip || !port) {
        throw new Error("server ip and port is required.");
    }
    client.connect(port, ip, function () {
        upload(filePath);
    });

    client.on('data', function (data) {
        console.log('Received: ' + data);
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
    connect,
    upload
};