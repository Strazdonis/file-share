const net = require('net');

const readline = require('readline');

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

async function askAndSend(client) {
    const ans = await askQuestion("Data to send:");
    //255 indicates start of a chunk
    const string = new Uint8Array([255, ...ans.split("").map((char) => char = char.charCodeAt(0).toString(10).padStart(2, "0"), "")]);
    console.log(string);
    //chunk size
    const size = new Uint8Array([string.length, 0, 0, 0]);
    console.log(size);
    client.write(size);
    setTimeout(() => {
        client.write(string, err => {
            console.log(err);
            askAndSend(client);
        });
        
    }, 50);

}

var client = new net.Socket();
async function init() {
    let ip = await askQuestion(`Enter Server IP Address (or enter "a" to connect to "127.0.0.1:55755"):`);
    if (ip === "a") {
        ip = "127.0.0.1:55755";
    }
    console.log("Attempting to connect...");
    client.connect(55755, '127.0.0.1', async function () {
        console.log('Connected');
        askAndSend(client);
    });

    client.on('data', function (data) {
        console.log('Received: ' + data);

    });

    client.on('close', function () {
        console.log('Connection closed');
    });
}

init();