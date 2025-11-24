import { createServer, Server as HttpServer } from 'http';
import { Server, Socket as ServerSocket } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { GameManager } from './game';
import { AddressInfo } from 'net';

describe('Jungeon Integration', () => {
    let io: Server;
    let serverSocket: ServerSocket;
    let clientSocket: ClientSocket;
    let gameManager: GameManager;
    let httpServer: HttpServer;
    let port: number;

    beforeAll((done) => {
        httpServer = createServer();
        io = new Server(httpServer);
        gameManager = new GameManager(io);

        io.on('connection', (socket) => {
            serverSocket = socket;
            gameManager.handleConnect(socket);
            socket.on('login', (id) => gameManager.handleLogin(socket, id));
            socket.on('command', (cmd) => gameManager.handleCommand(socket, cmd));
        });

        httpServer.listen(() => {
            port = (httpServer.address() as AddressInfo).port;
            clientSocket = Client(`http://localhost:${port}`);
            clientSocket.on('connect', done);
        });
    });

    afterAll(() => {
        io.close();
        clientSocket.close();
        httpServer.close();
    });

    test('full login and look flow', (done) => {
        // Get a valid character ID from the file or just use one we know exists in the generator
        // The generator uses the same characters.json, so 'mage' should exist.
        clientSocket.emit('login', 'mage');

        clientSocket.on('loginSuccess', (data: any) => {
            expect(data.player.character.id).toBe('mage');

            // After login, we should get roomData (look)
            clientSocket.on('roomData', (room: any) => {
                expect(room.name).toBeDefined();
                expect(room.desc).toBeDefined();
                done();
            });
        });
    });

    test('chat broadcast', (done) => {
        // We need a second client to verify broadcast
        const client2 = Client(`http://localhost:${port}`);

        client2.on('connect', () => {
            client2.emit('login', 'rogue');

            // Wait for login to complete
            setTimeout(() => {
                client2.on('message', (msg: any) => {
                    if (msg.includes('says: "Hello"')) {
                        client2.close();
                        done();
                    }
                });

                clientSocket.emit('command', 'say Hello');
            }, 100);
        });
    });
});
