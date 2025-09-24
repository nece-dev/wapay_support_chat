const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
});

// Import and use namespaces, passing both io and app
require('./escrow')(io, app);
require('./support')(io, app);
require('./auto_logout')(io, app);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 WebSocket server running on port ${PORT}`);
});