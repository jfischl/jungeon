/**
 * StatsPanel - Manages player stats display (HP, Level, XP, ATK, DEF)
 */
export class StatsPanel {
    private hpElement: HTMLSpanElement;
    private maxHpElement: HTMLSpanElement;
    private levelElement: HTMLSpanElement;
    private xpElement: HTMLSpanElement;
    private attackElement: HTMLSpanElement;
    private defenseElement: HTMLSpanElement;

    constructor() {
        this.hpElement = this.getElement('player-hp');
        this.maxHpElement = this.getElement('player-max-hp');
        this.levelElement = this.getElement('player-level');
        this.xpElement = this.getElement('player-xp');
        this.attackElement = this.getElement('player-attack');
        this.defenseElement = this.getElement('player-defense');
    }

    private getElement(id: string): HTMLSpanElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Stats element #${id} not found`);
        }
        return element as HTMLSpanElement;
    }

    updateStats(stats: {
        hp: number;
        maxHp: number;
        level: number;
        experience: number;
        attack: number;
        defense: number;
    }): void {
        this.hpElement.textContent = stats.hp.toString();
        this.maxHpElement.textContent = stats.maxHp.toString();
        this.levelElement.textContent = stats.level.toString();
        this.xpElement.textContent = stats.experience.toString();
        this.attackElement.textContent = stats.attack.toString();
        this.defenseElement.textContent = stats.defense.toString();
    }
}
