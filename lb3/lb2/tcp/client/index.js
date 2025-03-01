const net = require('net');

const client = new net.Socket();

client.connect(3000, 'server', () => {
    console.log('Connected to server');

    const message = 'Hello, Server!';
    client.write(message);
});

client.on('data', (data) => {
    console.log(`Received zeros from server: ${data.toString()}`);
    client.destroy();
});

client.on('close', () => {
    console.log('Connection closed');
});