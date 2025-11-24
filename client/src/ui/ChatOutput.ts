/**
 * ChatOutput - Manages the message output display
 */
export class ChatOutput {
    private outputElement: HTMLDivElement;

    constructor(outputElementId: string = 'output') {
        const element = document.getElementById(outputElementId);
        if (!element) {
            throw new Error(`Output element #${outputElementId} not found`);
        }
        this.outputElement = element as HTMLDivElement;
    }

    addLog(message: string, type: string = 'info'): void {
        const div = document.createElement('div');
        div.textContent = message;
        div.className = `log-entry ${type}`;
        this.outputElement.appendChild(div);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    clear(): void {
        this.outputElement.innerHTML = '';
    }
}
