const dgram = require('dgram');

const server = dgram.createSocket('udp4');

server.on('message', (message, remote) => {
    console.log(`Received message from client: ${message.toString()}`);

    const length = message.length;
    const zeros = '0'.repeat(length);

    server.send(zeros, remote.port, remote.address, (err) => {
        if (err) {
            console.error('Failed to send response');
        } else {
            console.log('Response sent to client');
        }
    });
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
});

server.bind(3000);