/**
 * Controls - Manages button controls and input handling
 */
export class Controls {
    private inputElement: HTMLInputElement;
    private buttons: {
        north?: HTMLButtonElement;
        south?: HTMLButtonElement;
        east?: HTMLButtonElement;
        west?: HTMLButtonElement;
        look?: HTMLButtonElement;
        get?: HTMLButtonElement;
        drop?: HTMLButtonElement;
        inv?: HTMLButtonElement;
    };

    private commandCallback?: (command: string) => void;

    constructor() {
        const input = document.getElementById('input');
        if (!input) {
            throw new Error('Input element not found');
        }
        this.inputElement = input as HTMLInputElement;

        // Get all button elements
        this.buttons = {
            north: document.getElementById('btn-n') as HTMLButtonElement | undefined,
            south: document.getElementById('btn-s') as HTMLButtonElement | undefined,
            east: document.getElementById('btn-e') as HTMLButtonElement | undefined,
            west: document.getElementById('btn-w') as HTMLButtonElement | undefined,
            look: document.getElementById('btn-look') as HTMLButtonElement | undefined,
            get: document.getElementById('btn-get') as HTMLButtonElement | undefined,
            drop: document.getElementById('btn-drop') as HTMLButtonElement | undefined,
            inv: document.getElementById('btn-inv') as HTMLButtonElement | undefined,
        };

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Button click handlers
        this.buttons.north?.addEventListener('click', () => this.sendCommand('n'));
        this.buttons.south?.addEventListener('click', () => this.sendCommand('s'));
        this.buttons.east?.addEventListener('click', () => this.sendCommand('e'));
        this.buttons.west?.addEventListener('click', () => this.sendCommand('w'));
        this.buttons.look?.addEventListener('click', () => this.sendCommand('look'));
        this.buttons.get?.addEventListener('click', () => this.sendCommand('get'));
        this.buttons.drop?.addEventListener('click', () => this.sendCommand('drop'));
        this.buttons.inv?.addEventListener('click', () => this.sendCommand('inv'));

        // Input enter key handler
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = this.inputElement.value;
                this.inputElement.value = '';
                if (cmd.trim().length > 0 && this.commandCallback) {
                    this.commandCallback(cmd);
                }
            }
        });
    }

    onCommand(callback: (command: string) => void): void {
        this.commandCallback = callback;
    }

    private sendCommand(cmd: string): void {
        if (this.commandCallback) {
            this.commandCallback(cmd);
        }
    }

    updateButtons(exits: string[]): void {
        if (this.buttons.north) this.buttons.north.disabled = !exits.includes('north');
        if (this.buttons.south) this.buttons.south.disabled = !exits.includes('south');
        if (this.buttons.east) this.buttons.east.disabled = !exits.includes('east');
        if (this.buttons.west) this.buttons.west.disabled = !exits.includes('west');
    }

    focus(): void {
        this.inputElement.focus();
    }
}
