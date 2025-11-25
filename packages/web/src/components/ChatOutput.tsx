import { useEffect, useRef } from 'react';
import { useGameStore } from '../context/GameContext';

export function ChatOutput() {
    const messages = useGameStore((state) => state.messages);
    const outputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="chat-output" ref={outputRef}>
            {messages.map((msg) => (
                <div key={msg.id} className={`log-entry ${msg.type}`}>
                    {msg.text}
                </div>
            ))}
        </div>
    );
}
