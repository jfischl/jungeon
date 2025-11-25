import { useGameStore } from '../context/GameContext';

export function InventoryPanel() {
    const inventory = useGameStore((state) => state.inventory);

    return (
        <div className="status-box">
            <h2>Inventory</h2>
            <div>Gold: {inventory?.coins ?? 0}</div>
            {inventory?.items && inventory.items.length > 0 ? (
                inventory.items.map((item, index) => (
                    <div key={index} className="inventory-item">
                        {item.name}
                    </div>
                ))
            ) : (
                <div style={{ color: '#666' }}>Empty</div>
            )}
        </div>
    );
}
