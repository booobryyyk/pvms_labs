const dgram = require('dgram');

const client = dgram.createSocket('udp4');

const message = 'Hello, Server!';
client.send(message, 3000, '0.0.0.0', (err) => {
    if (err) {
        console.error('Failed to send message');
    } else {
        console.log('Message sent to server');
    }
});

client.on('message', (data, remote) => {
    console.log(`Received zeros from server: ${data.toString()}`);
    client.close();
});

client.on('close', () => {
    console.log('Connection closed');
});