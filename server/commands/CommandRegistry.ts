import { Socket } from 'socket.io';
import { Command } from './Command';
import { MoveCommand } from './MoveCommand';
import { LookCommand } from './LookCommand';
import { GetCommand } from './GetCommand';
import { DropCommand } from './DropCommand';
import { InventoryCommand } from './InventoryCommand';
import { SayCommand } from './SayCommand';
import { EmoteCommand } from './EmoteCommand';
import { DebugCommand } from './DebugCommand';
import { ExamineCommand } from './ExamineCommand';
import { UnlockCommand } from './UnlockCommand';
import { AttackCommand } from './AttackCommand';
import { FleeCommand } from './FleeCommand';
import { DefendCommand } from './DefendCommand';
import { HealCommand } from './HealCommand';
import { ChallengeCommand } from './ChallengeCommand';
import { AcceptCommand } from './AcceptCommand';
import { validateCommandInput, parseCommand } from '../../shared/validators';
import { gameLogger } from '../logger';
import type { GameManager } from '../game';

/**
 * CommandRegistry - Manages command registration and execution
 *
 * Responsibilities:
 * - Register all game commands with their aliases
 * - Parse and validate command input
 * - Execute commands with proper error handling
 */
export class CommandRegistry {
    private commands: Map<string, Command>;

    constructor() {
        this.commands = new Map();
        this.registerAllCommands();
    }

    private registerAllCommands(): void {
        // Movement commands
        this.register('n', new MoveCommand('north'));
        this.register('north', new MoveCommand('north'));
        this.register('s', new MoveCommand('south'));
        this.register('south', new MoveCommand('south'));
        this.register('e', new MoveCommand('east'));
        this.register('east', new MoveCommand('east'));
        this.register('w', new MoveCommand('west'));
        this.register('west', new MoveCommand('west'));

        // Observation commands
        this.register('look', new LookCommand());
        this.register('l', new LookCommand());

        // Item commands
        this.register('get', new GetCommand());
        this.register('collect', new GetCommand());
        this.register('drop', new DropCommand());
        this.register('inv', new InventoryCommand());
        this.register('inventory', new InventoryCommand());
        this.register('examine', new ExamineCommand());
        this.register('ex', new ExamineCommand());
        this.register('unlock', new UnlockCommand());

        // Social commands
        this.register('say', new SayCommand());
        this.register('emote', new EmoteCommand());
        this.register('me', new EmoteCommand());

        // Combat commands
        this.register('attack', new AttackCommand());
        this.register('kill', new AttackCommand());
        this.register('flee', new FleeCommand());
        this.register('run', new FleeCommand());
        this.register('defend', new DefendCommand());
        this.register('block', new DefendCommand());
        this.register('heal', new HealCommand());
        this.register('drink', new HealCommand());
        this.register('challenge', new ChallengeCommand());
        this.register('duel', new ChallengeCommand());
        this.register('accept', new AcceptCommand());

        // Utility commands
        this.register('debug', new DebugCommand());
    }

    private register(name: string, command: Command): void {
        this.commands.set(name, command);
    }

    /**
     * Execute a command from user input
     */
    execute(socket: Socket, commandString: string, game: GameManager): void {
        try {
            // Security: Validate command input
            if (!validateCommandInput(commandString)) {
                socket.emit('error', 'Invalid command format');
                return;
            }

            // Parse command
            const { command: commandName, args } = parseCommand(commandString);

            // Look up command
            const command = this.commands.get(commandName);
            if (!command) {
                socket.emit('message', `Unknown command: ${commandName}`);
                return;
            }

            // Execute command
            gameLogger.debug({ command: commandName, args }, 'Executing command');
            command.execute(socket, args, game);

        } catch (error) {
            gameLogger.error({ error, commandString }, 'Command execution failed');
            socket.emit('error', 'Failed to execute command');
        }
    }

    /**
     * Get all registered command names (for testing/debugging)
     */
    getRegisteredCommands(): string[] {
        return Array.from(this.commands.keys());
    }
}
