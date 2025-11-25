export function HelpPanel() {
    return (
        <div className="status-box">
            <h2>Commands</h2>
            <ul className="help-list">
                <li><strong>n/s/e/w</strong> - Move</li>
                <li><strong>look</strong> - Look around</li>
                <li><strong>get [item]</strong> - Pick up</li>
                <li><strong>drop [item]</strong> - Drop item</li>
                <li><strong>collect</strong> - Get coins</li>
                <li><strong>unlock [dir]</strong> - Use key</li>
                <li><strong>attack [target]</strong> - Fight</li>
                <li><strong>say [msg]</strong> - Chat</li>
            </ul>
        </div>
    );
}
