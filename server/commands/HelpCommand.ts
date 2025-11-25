import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class HelpCommand implements Command {
    execute(socket: Socket, _args: string, _game: GameManager): void {
        const helpText = `
=== The Jungeon Commands ===

MOVEMENT:
  n, s, e, w     - Move north, south, east, or west
  look (l)       - Look around the current room

ITEMS:
  get <item>     - Pick up an item
  collect        - Pick up coins from the room
  drop           - Drop all your coins
  inv            - Show your inventory
  examine <item> - Examine an item closely
  unlock <dir>   - Unlock a door (requires key)

COMBAT:
  attack <target> - Attack a monster or player
  defend          - Defend (reduce damage next hit)
  heal            - Drink a healing potion (10 coins)
  flee            - Attempt to flee from combat

PVP:
  challenge <player> - Challenge another player to a duel
  accept             - Accept a pending duel challenge

SOCIAL:
  say <message>    - Say something to everyone in the room
  emote <action>   - Perform an action (e.g., "emote waves")

Type a command to get started!
`.trim();

        socket.emit('message', helpText);
    }
}
