/**
 * LoginOverlay - Manages the character selection overlay
 */
export class LoginOverlay {
    private overlayElement: HTMLDivElement;
    private characterListElement: HTMLDivElement;
    private onCharacterSelectCallback?: (characterId: string) => void;

    constructor() {
        const overlay = document.getElementById('login-overlay');
        const charList = document.getElementById('character-list');

        if (!overlay || !charList) {
            throw new Error('Login overlay elements not found');
        }

        this.overlayElement = overlay as HTMLDivElement;
        this.characterListElement = charList as HTMLDivElement;
    }

    show(characters: any[]): void {
        this.characterListElement.innerHTML = '';

        characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'character-card';

            const name = document.createElement('h3');
            name.textContent = char.name;

            const desc = document.createElement('p');
            desc.textContent = char.description;

            card.appendChild(name);
            card.appendChild(desc);

            card.addEventListener('click', () => {
                if (this.onCharacterSelectCallback) {
                    this.onCharacterSelectCallback(char.id);
                }
            });

            this.characterListElement.appendChild(card);
        });

        this.overlayElement.style.display = 'flex';
    }

    hide(): void {
        this.overlayElement.style.display = 'none';
    }

    onCharacterSelect(callback: (characterId: string) => void): void {
        this.onCharacterSelectCallback = callback;
    }
}
