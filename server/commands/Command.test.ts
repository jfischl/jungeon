import { GameManager } from '../game';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import Client from 'socket.io-client';

describe('Command Integration', () => {
    let io: Server;
    let serverSocket: Socket;
    let clientSocket: any;
    let game: GameManager;
    let httpServer: any;

    beforeAll((done) => {
        httpServer = createServer();
        io = new Server(httpServer);

        // Initialize game
        game = new GameManager(io);
        // Mock repository to avoid file I/O
        (game as any).repository = {
            loadWorld: () => ({
                starting_room: 'room_a',
                rooms: {
                    'room_a': { id: 'room_a', name: 'Room A', description: 'A room', exits: { north: 'room_b' }, x: 0, y: 0, items: [], coins: 0, locks: {} },
                    'room_b': { id: 'room_b', name: 'Room B', description: 'Another room', exits: { south: 'room_a' }, x: 0, y: 1, items: [], coins: 0, locks: {} }
                }
            }),
            loadCharacters: () => [{ id: 'warrior', name: 'Warrior', description: 'A warrior', baseHp: 100, baseAttack: 15, baseDefense: 10 }],
            loadPlayers: () => ({}),
            saveWorld: jest.fn(),
            savePlayers: jest.fn()
        };
        // Reload game with mocked data
        game.loadGame();

        httpServer.listen(() => {
            const port = (httpServer.address() as AddressInfo).port;
            clientSocket = Client(`http://localhost:${port}`);
            io.on('connection', (socket) => {
                serverSocket = socket;
                game.handleConnect(socket);
            });
            clientSocket.on('connect', done);
        });
    });

    afterAll(() => {
        // Clean up ghost movement interval to prevent Jest warning
        game.ghostManager.stopMovementLoop();
        io.close();
        clientSocket.close();
        httpServer.close();
    });

    it('should register move commands correctly', (done) => {
        // We need to login first
        clientSocket.emit('login', 'warrior');

        clientSocket.once('loginSuccess', () => {
            // Spy on game.move
            const moveSpy = jest.spyOn(game, 'move');

            // Test 'n' alias
            clientSocket.emit('command', 'n');

            setTimeout(() => {
                expect(moveSpy).toHaveBeenCalledWith(expect.anything(), 'north');
                moveSpy.mockClear();
                done();
            }, 50);
        });
    });
});
