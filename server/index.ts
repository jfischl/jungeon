import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { GameManager } from './game';
import { MapGenerator } from './map-generator';
import { serverLogger } from './logger';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

const PORT = process.env.PORT || 3000;

// CLI Argument Handling
if (process.argv.includes('--generate')) {
    serverLogger.info('Generating new world...');
    const generator = new MapGenerator();
    generator.generate();
    serverLogger.info('World generation complete');
    // We continue to start the server after generation
}

// Serve static files from 'dist/client'
app.use(express.static(path.join(__dirname, '../client')));

const game = new GameManager(io);

io.on('connection', (socket) => {
    game.handleConnect(socket);
});

server.listen(PORT, () => {
    serverLogger.info(
        {
            port: PORT,
            env: process.env.NODE_ENV || 'development',
            logLevel: process.env.LOG_LEVEL || 'info'
        },
        'Server started'
    );
});
