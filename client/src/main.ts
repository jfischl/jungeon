import { RoomDataPacket, SoundHint } from '../../shared/types';
import { validateCommandInput, sanitizeInput } from '../../shared/validators';
import { SocketService } from './services/SocketService';
import { SoundManager } from './services/SoundManager';
import { ChatOutput } from './ui/ChatOutput';
import { StatsPanel } from './ui/StatsPanel';
import { InventoryPanel } from './ui/InventoryPanel';
import { Minimap } from './ui/Minimap';
import { Controls } from './ui/Controls';
import { LoginOverlay } from './ui/LoginOverlay';

/**
 * Main Application Class
 * Orchestrates all UI components and socket communication
 */
class GameClient {
    private socket: SocketService;
    private sound: SoundManager;
    private chat: ChatOutput;
    private stats: StatsPanel;
    private inventory: InventoryPanel;
    private minimap: Minimap;
    private controls: Controls;
    private loginOverlay: LoginOverlay;
    private previousHp: number = 0;

    constructor() {
        // Initialize services
        this.socket = new SocketService();
        this.sound = new SoundManager();

        // Initialize UI components
        this.chat = new ChatOutput();
        this.stats = new StatsPanel();
        this.inventory = new InventoryPanel();
        this.minimap = new Minimap();
        this.controls = new Controls();
        this.loginOverlay = new LoginOverlay();

        // Setup event handlers
        this.setupSocketHandlers();
        this.setupUIHandlers();
    }

    private setupSocketHandlers(): void {
        // Connection events
        this.socket.onConnect(() => {
            this.chat.addLog("Connected to server.", 'success');
        });

        this.socket.onDisconnect(() => {
            this.chat.addLog("Disconnected from server.", 'error');
        });

        // Game events
        this.socket.onWelcome((data) => {
            this.chat.addLog(data.message, 'info');
            this.loginOverlay.show(data.availableCharacters);
        });

        this.socket.onLoginSuccess((data) => {
            // Initialize sound on first user interaction (login)
            this.sound.initialize();
            this.chat.addLog(
                `Logged in as ${data.player.character.name}. Welcome to ${data.worldName}!`,
                'success'
            );
            this.loginOverlay.hide();
            this.controls.focus();
            this.previousHp = data.player.hp;
        });

        this.socket.onMessage((msg, soundHint) => {
            this.chat.addLog(msg, 'info');
            this.sound.playHint(soundHint);
        });

        this.socket.onError((msg, soundHint) => {
            this.chat.addLog(`Error: ${msg}`, 'error');
            this.sound.playHint(soundHint);
        });

        this.socket.onRoomData((data) => {
            this.handleRoomData(data);
            this.sound.playHint(data.soundHint);
        });

        this.socket.onUpdateInventory((inventory) => {
            this.inventory.updateInventory(inventory);
        });

        this.socket.onUpdateStats((stats) => {
            // Detect HP changes for damage/heal sounds (if not covered by message hints)
            if (stats.hp < this.previousHp) {
                // Taking damage - but don't double-play if server already sent hint
            }
            this.previousHp = stats.hp;
            this.stats.updateStats(stats);
        });

        // Standalone sound events (for sounds without accompanying messages)
        this.socket.onSound((soundHint) => {
            this.sound.play(soundHint);
        });
    }

    private setupUIHandlers(): void {
        // Handle commands from controls (buttons and text input)
        this.controls.onCommand((cmd) => {
            this.handleCommand(cmd);
        });

        // Handle character selection
        this.loginOverlay.onCharacterSelect((charId) => {
            this.socket.sendLogin(charId);
        });

        // Expose debug function to window
        (window as any).debug = () => {
            this.sendCommand('debug');
        };

        // Expose sound controls to window for debugging/testing
        (window as any).sound = {
            toggle: () => {
                const enabled = this.sound.toggle();
                this.chat.addLog(`Sound ${enabled ? 'enabled' : 'disabled'}`, 'info');
                return enabled;
            },
            setVolume: (vol: number) => {
                this.sound.setVolume(vol);
                this.chat.addLog(`Volume set to ${Math.round(vol * 100)}%`, 'info');
            },
            test: (hint: SoundHint) => {
                this.sound.play(hint);
            }
        };
    }

    private handleCommand(cmd: string): void {
        const sanitized = sanitizeInput(cmd);

        // Check if it's a character login
        const commonIds = ['warrior', 'rogue', 'mage', 'cleric'];
        if (commonIds.includes(sanitized.toLowerCase())) {
            this.socket.sendLogin(sanitized.toLowerCase());
            return;
        }

        // Otherwise, send as game command
        this.sendCommand(sanitized);
    }

    private sendCommand(cmd: string): void {
        if (!cmd) return;

        // Client-side validation for immediate feedback
        const validation = validateCommandInput(cmd);
        if (!validation.valid) {
            this.chat.addLog(`Error: ${validation.error}`, 'error');
            return;
        }

        // Send to server
        const sanitized = sanitizeInput(cmd);
        this.socket.sendCommand(sanitized);
        this.chat.addLog(`> ${sanitized}`, 'command');
    }

    private handleRoomData(data: RoomDataPacket): void {
        this.chat.addLog(`\n=== ${data.name} ===`, 'room-title');
        this.chat.addLog(data.desc, 'room-desc');

        if (data.exits.length > 0) {
            this.chat.addLog(`Exits: ${data.exits.join(', ')}`, 'info');
            this.controls.updateButtons(data.exits);
        } else {
            this.chat.addLog("No visible exits.", 'info');
            this.controls.updateButtons([]);
        }

        if (data.items && data.items.length > 0) {
            const itemNames = data.items.map(i => i.name).join(', ');
            this.chat.addLog(`You see: ${itemNames}`, 'info');
        }

        if (data.coins > 0) {
            this.chat.addLog(`You see ${data.coins} coins.`, 'info');
        }

        if (data.players && data.players.length > 0) {
            this.chat.addLog(`Also here: ${data.players.join(', ')}`, 'info');
        }

        if (data.ghosts && data.ghosts.length > 0) {
            for (const ghost of data.ghosts) {
                this.chat.addLog(ghost, 'warning');
            }
        }

        if (data.minimap) {
            this.minimap.update(data.minimap);
        }
    }
}

// Initialize the game client when DOM is ready
new GameClient();
