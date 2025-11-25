import { useGameStore, useGameClient } from '../context/GameContext';
import type { Character } from '@jungeon/shared';

export function LoginOverlay() {
    const isLoggedIn = useGameStore((state) => state.isLoggedIn);
    const availableCharacters = useGameStore((state) => state.availableCharacters);
    const client = useGameClient();

    if (isLoggedIn) {
        return null;
    }

    const handleSelectCharacter = (character: Character) => {
        client.login(character.id);
    };

    return (
        <div className="login-overlay">
            <div className="login-box">
                <h1>The Jungeon</h1>
                <p>Select your character to enter:</p>
                <div className="character-list">
                    {availableCharacters.map((character) => (
                        <div
                            key={character.id}
                            className="character-card"
                            onClick={() => handleSelectCharacter(character)}
                        >
                            <h3>{character.name}</h3>
                            <p>{character.description}</p>
                            <p style={{ marginTop: '0.5rem', color: '#888' }}>
                                HP: {character.baseHp} | ATK: {character.baseAttack} | DEF: {character.baseDefense}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
