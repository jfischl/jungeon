import { LoginOverlay } from './components/LoginOverlay';
import { ChatOutput } from './components/ChatOutput';
import { Controls } from './components/Controls';
import { Minimap } from './components/Minimap';
import { StatsPanel } from './components/StatsPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { HelpPanel } from './components/HelpPanel';

export function App() {
    return (
        <div className="game-container">
            <LoginOverlay />
            <div className="main-area">
                <ChatOutput />
                <Controls />
            </div>
            <div className="sidebar">
                <Minimap />
                <StatsPanel />
                <InventoryPanel />
                <HelpPanel />
            </div>
        </div>
    );
}
