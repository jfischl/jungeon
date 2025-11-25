import { useGameStore } from '../context/GameContext';

export function StatsPanel() {
    const player = useGameStore((state) => state.player);
    const playerStats = useGameStore((state) => state.playerStats);

    if (!player || !playerStats) {
        return null;
    }

    return (
        <div className="status-box">
            <h2>{player.character.name}</h2>
            <div className="player-stats">
                <div>HP: {playerStats.hp}/{playerStats.maxHp}</div>
                <div>ATK: {playerStats.attack}</div>
                <div>DEF: {playerStats.defense}</div>
                <div>Level: {playerStats.level}</div>
                <div>XP: {playerStats.experience}/100</div>
            </div>
        </div>
    );
}
