const net = require('net');
const fs = require('fs');
const readline = require('readline');

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
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}


async function sendFile(client) {
    const filePath = await askQuestion("File to send:");
    let file_size = getFilesizeInBytes(filePath);
    console.log("FILE size:", file_size);
    file_size += 1; //add up for '255' in the beggining of first chunk
    const chunk_amount = Math.trunc(file_size / 256);
    console.log("chunks:", chunk_amount);

    const size = new Uint8Array(17);
    size.set([10, 8,0,0,0,0,0,0,0, 0,0,0,0, 123,123,123,123], 0);

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
                    return sendFile(client);
                }

                let data;
                if (nread < CHUNK_SIZE) {
              //      console.log("MAZIAU");
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
                const encoded = new Uint8Array(str2ab("test"));
                data = new Uint8Array(encoded.length + 1);
                data.set([11]);
                data.set(encoded, 1);
                
                console.log("SENDING", data);
                
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

var client = new net.Socket({readable: true, writable: true});
async function init() {
    let answer = await askQuestion(`Enter Server IP Address 
(or enter "a" to connect to "127.0.0.1:55755" or "b" to connect to "206.189.58.160:55755"):`);
console.log("ATSAKE", answer);
    let ip, port = "55755";
    if (answer === "a") {
        ip = "127.0.0.1";
    }  else if(answer === "b") {
        ip = "206.189.58.160";
    } else {
        ip = answer.split[":"][0];
        port = answer.split[":"][1] || "55755";
    }
    console.log("Attempting to connect...");
    client.connect(port, ip, function () {
        sendFile(client);
    });

    client.on('data', function (data) {
        console.log('Received: ' + data);
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
