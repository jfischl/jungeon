import { io, Socket } from 'socket.io-client';
import { RoomDataPacket, Inventory, Player } from '../../shared/types';

console.log("Connecting to server at:", import.meta.env.VITE_SERVER_URL || 'http://localhost:3000');
const socket: Socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3000', {
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 20000,
    forceNew: true
});

const output = document.getElementById('output') as HTMLDivElement;
const input = document.getElementById('input') as HTMLInputElement;
const minimapPre = document.getElementById('minimap') as HTMLPreElement;
const loginOverlay = document.getElementById('login-overlay') as HTMLDivElement;
const characterList = document.getElementById('character-list') as HTMLDivElement;
const coinCount = document.getElementById('coin-count') as HTMLSpanElement;
const itemList = document.getElementById('item-list') as HTMLDivElement;
const playerHp = document.getElementById('player-hp') as HTMLSpanElement;
const playerMaxHp = document.getElementById('player-max-hp') as HTMLSpanElement;
const playerLevel = document.getElementById('player-level') as HTMLSpanElement;
const playerXp = document.getElementById('player-xp') as HTMLSpanElement;
const playerAttack = document.getElementById('player-attack') as HTMLSpanElement;
const playerDefense = document.getElementById('player-defense') as HTMLSpanElement;

// Buttons
const btnN = document.getElementById('btn-n') as HTMLButtonElement;
const btnS = document.getElementById('btn-s') as HTMLButtonElement;
const btnE = document.getElementById('btn-e') as HTMLButtonElement;
const btnW = document.getElementById('btn-w') as HTMLButtonElement;
const btnLook = document.getElementById('btn-look') as HTMLButtonElement;
const btnGet = document.getElementById('btn-get') as HTMLButtonElement;
const btnDrop = document.getElementById('btn-drop') as HTMLButtonElement;
const btnInv = document.getElementById('btn-inv') as HTMLButtonElement;

function addLog(message: string, type: string = 'info'): void {
    const div = document.createElement('div');
    div.textContent = message;
    div.className = `log-entry ${type}`;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
}

function updateButtons(exits: string[]): void {
    if (btnN) btnN.disabled = !exits.includes('north');
    if (btnS) btnS.disabled = !exits.includes('south');
    if (btnE) btnE.disabled = !exits.includes('east');
    if (btnW) btnW.disabled = !exits.includes('west');
}

function sendCommand(cmd: string): void {
    if (cmd) {
        socket.emit('command', cmd);
        addLog(`> ${cmd}`, 'command');
    }
}

// Button Listeners
btnN?.addEventListener('click', () => sendCommand('n'));
btnS?.addEventListener('click', () => sendCommand('s'));
btnE?.addEventListener('click', () => sendCommand('e'));
btnW?.addEventListener('click', () => sendCommand('w'));
btnLook?.addEventListener('click', () => sendCommand('look'));
btnGet?.addEventListener('click', () => sendCommand('get'));
btnDrop?.addEventListener('click', () => sendCommand('drop'));
btnInv?.addEventListener('click', () => sendCommand('inv'));

socket.on('connect', () => {
    addLog("Connected to server.", 'success');
});

socket.on('disconnect', () => {
    addLog("Disconnected from server.", 'error');
});

socket.on('welcome', (data: { message: string; availableCharacters: any[] }) => {
    addLog(data.message, 'info');

    // Render character list
    characterList.innerHTML = '';
    data.availableCharacters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'character-card';

        const name = document.createElement('h3');
        name.textContent = char.name;

        const desc = document.createElement('p');
        desc.textContent = char.description;

        card.appendChild(name);
        card.appendChild(desc);

        card.addEventListener('click', () => {
            socket.emit('login', char.id);
        });

        characterList.appendChild(card);
    });

    loginOverlay.style.display = 'flex';
});

socket.on('message', (msg: string) => {
    addLog(msg, 'info');
});

socket.on('roomData', (data: RoomDataPacket) => {
    addLog(`\n=== ${data.name} ===`, 'room-title');
    addLog(data.desc, 'room-desc');

    if (data.exits.length > 0) {
        addLog(`Exits: ${data.exits.join(', ')}`, 'info');
        updateButtons(data.exits);
    } else {
        addLog("No visible exits.", 'info');
        updateButtons([]);
    }

    if (data.items && data.items.length > 0) {
        const itemNames = data.items.map(i => i.name).join(', ');
        addLog(`You see: ${itemNames}`, 'info');
    }

    if (data.coins > 0) {
        addLog(`You see ${data.coins} coins.`, 'info');
    }

    if (data.players && data.players.length > 0) {
        addLog(`Also here: ${data.players.join(', ')}`, 'info');
    }

    if (data.ghosts && data.ghosts.length > 0) {
        for (const ghost of data.ghosts) {
            addLog(ghost, 'warning');
        }
    }

    if (data.minimap) {
        minimapPre.textContent = data.minimap;
    }
});

socket.on('loginSuccess', (data: { player: Player; worldName: string }) => {
    addLog(`Logged in as ${data.player.character.name}. Welcome to ${data.worldName}!`, 'success');
    loginOverlay.style.display = 'none';
    input.focus();
});

socket.on('error', (msg: string) => {
    addLog(`Error: ${msg}`, 'error');
});

socket.on('updateInventory', (inv: Inventory) => {
    if (coinCount) {
        coinCount.textContent = inv.coins.toString();
    }

    if (itemList) {
        itemList.innerHTML = '';
        if (inv.items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'item';
            empty.textContent = '(empty)';
            empty.style.color = '#666';
            itemList.appendChild(empty);
        } else {
            inv.items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'item';
                div.textContent = item.name;
                itemList.appendChild(div);
            });
        }
    }
});

// Update player stats
socket.on('updateStats', (stats: { hp: number; maxHp: number; level: number; experience: number; attack: number; defense: number }) => {
    if (playerHp) playerHp.textContent = stats.hp.toString();
    if (playerMaxHp) playerMaxHp.textContent = stats.maxHp.toString();
    if (playerLevel) playerLevel.textContent = stats.level.toString();
    if (playerXp) playerXp.textContent = stats.experience.toString();
    if (playerAttack) playerAttack.textContent = stats.attack.toString();
    if (playerDefense) playerDefense.textContent = stats.defense.toString();
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = input.value;
        input.value = '';

        // Check if we are logging in
        // This is a bit hacky, ideally we'd have a proper login state
        if (cmd.trim().length > 0) {
            // If it looks like a character ID, try login (simplified logic)
            const commonIds = ['warrior', 'rogue', 'mage', 'cleric'];
            if (commonIds.includes(cmd.trim().toLowerCase())) {
                socket.emit('login', cmd.trim().toLowerCase());
            } else {
                sendCommand(cmd);
            }
        }
    }
});

// Expose debug to window
(window as any).debug = () => {
    sendCommand('debug');
};
