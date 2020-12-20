const net = require('net');
const fs = require('fs');

const CHUNK_SIZE = 10000000, // 10MB
    buffer = Buffer.alloc(CHUNK_SIZE);

var client = new net.Socket({readable: true, writable: true});

function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename);
    var fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

const START = new Uint8Array([255]);
function encode(buf) {
    return Uint8Array.from(buf);
}

async function send(filePath) {
    let file_size = getFilesizeInBytes(filePath);
    console.log("FILE size:", file_size);
    file_size += 1; //add up for '255' in the beggining of first chunk
    const chunk_amount = Math.trunc(file_size / 256);
    console.log("chunks:", chunk_amount);

    const size = new Uint8Array(chunk_amount > 4 ? chunk_amount : 4);
    size[0] = file_size % 256;
    size[1] = chunk_amount;

    console.log(size);

    let first_send = 1;

    client.write(size);
    fs.open(filePath, 'r', function (err, fd) {

        if (err) {
            throw err;
        }
        function readNextChunk() {
            //buffer[0] = 255;

            fs.read(fd, buffer, 0, CHUNK_SIZE, null, function (err, nread) {
                // i assume this needs to be +1 since im adding 255 to the start of first chunk
                if(first_send) {
                    nread +=1 ;
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
                    return sendFile(client);
                }

                let data;
                if (nread < CHUNK_SIZE) {
                    let slice = buffer.slice(0, nread-first_send); //subtract the added 1 (L:56)
                    
                    if(first_send) {
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
    if(!ip || !port) {
        throw new Error("server ip and port is required.");
    }
    client.connect(port, ip, function () {
        send(filePath);
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
    send
};