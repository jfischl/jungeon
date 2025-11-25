import { useState, useRef, useEffect } from 'react';
import { useGameClient, useGameStore } from '../context/GameContext';

export function Controls() {
    const [command, setCommand] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const client = useGameClient();
    const currentRoom = useGameStore((state) => state.currentRoom);
    const isLoggedIn = useGameStore((state) => state.isLoggedIn);

    const exits = currentRoom?.exits || [];

    useEffect(() => {
        if (isLoggedIn && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLoggedIn]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (command.trim()) {
            client.sendCommand(command.trim());
            setCommand('');
        }
    };

    const handleDirectionClick = (direction: string) => {
        client.sendCommand(direction);
    };

    const handleActionClick = (action: string) => {
        client.sendCommand(action);
    };

    const hasExit = (dir: string) => exits.includes(dir);

    return (
        <div className="input-area">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flex: 1 }}>
                <input
                    ref={inputRef}
                    type="text"
                    className="command-input"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter command..."
                    autoComplete="off"
                />
            </form>
            <div className="controls">
                <div className="dpad">
                    <button
                        className="btn-n"
                        onClick={() => handleDirectionClick('n')}
                        disabled={!hasExit('north')}
                    >
                        N
                    </button>
                    <div className="dpad-row">
                        <button
                            onClick={() => handleDirectionClick('w')}
                            disabled={!hasExit('west')}
                        >
                            W
                        </button>
                        <button
                            onClick={() => handleDirectionClick('s')}
                            disabled={!hasExit('south')}
                        >
                            S
                        </button>
                        <button
                            onClick={() => handleDirectionClick('e')}
                            disabled={!hasExit('east')}
                        >
                            E
                        </button>
                    </div>
                </div>
                <div className="actions">
                    <button onClick={() => handleActionClick('look')}>Look</button>
                    <button onClick={() => handleActionClick('collect')}>Get</button>
                    <button onClick={() => handleActionClick('drop')}>Drop</button>
                    <button onClick={() => handleActionClick('inv')}>Inv</button>
                </div>
            </div>
        </div>
    );
}
