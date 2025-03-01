const net = require('net');

const server = net.createServer((socket) => {
    console.log('Client connected');

    socket.on('data', (data) => {
        const message = data.toString();
        console.log(`Received message from client: ${message}`);

        const length = message.length;
        const zeros = '0'.repeat(length);

        socket.write(zeros);
    });

    socket.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});