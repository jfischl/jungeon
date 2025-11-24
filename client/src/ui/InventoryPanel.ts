import { Inventory } from '../../../shared/types';

/**
 * InventoryPanel - Manages inventory display (coins and items)
 */
export class InventoryPanel {
    private coinCountElement: HTMLSpanElement;
    private itemListElement: HTMLDivElement;

    constructor() {
        const coinCount = document.getElementById('coin-count');
        const itemList = document.getElementById('item-list');

        if (!coinCount || !itemList) {
            throw new Error('Inventory elements not found');
        }

        this.coinCountElement = coinCount as HTMLSpanElement;
        this.itemListElement = itemList as HTMLDivElement;
    }

    updateInventory(inventory: Inventory): void {
        // Update coin count
        this.coinCountElement.textContent = inventory.coins.toString();

        // Update item list
        this.itemListElement.innerHTML = '';

        if (inventory.items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'item';
            empty.textContent = '(empty)';
            empty.style.color = '#666';
            this.itemListElement.appendChild(empty);
        } else {
            inventory.items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'item';
                div.textContent = item.name;
                this.itemListElement.appendChild(div);
            });
        }
    }
}
