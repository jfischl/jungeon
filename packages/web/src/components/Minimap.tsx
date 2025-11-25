import { useGameStore } from '../context/GameContext';

export function Minimap() {
    const minimap = useGameStore((state) => state.currentRoom?.minimap);

    return (
        <div className="status-box">
            <h2>Map</h2>
            <div className="minimap">
                {minimap || 'Exploring...'}
            </div>
        </div>
    );
}
