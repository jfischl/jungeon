/**
 * Minimap - Manages the ASCII minimap display
 */
export class Minimap {
    private minimapElement: HTMLPreElement;

    constructor() {
        const element = document.getElementById('minimap');
        if (!element) {
            throw new Error('Minimap element not found');
        }
        this.minimapElement = element as HTMLPreElement;
    }

    update(minimapText: string): void {
        this.minimapElement.textContent = minimapText;
    }

    clear(): void {
        this.minimapElement.textContent = '';
    }
}
