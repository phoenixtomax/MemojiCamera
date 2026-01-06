import { useEffect, useState } from 'react';

export function DebugConsole() {
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const originalLog = console.log;
        const originalError = console.error;

        console.log = (...args) => {
            setLogs(prev => [...prev, `LOG: ${args.join(' ')}`].slice(-20));
            originalLog(...args);
        };

        console.error = (...args) => {
            setLogs(prev => [...prev, `ERR: ${args.join(' ')}`].slice(-20));
            originalError(...args);
        };

        return () => {
            console.log = originalLog;
            console.error = originalError;
        };
    }, []);

    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '200px',
            overflowY: 'scroll',
            background: 'rgba(0,0,0,0.8)',
            color: '#0f0',
            fontSize: '10px',
            zIndex: 9999,
            pointerEvents: 'none'
        }}>
            {logs.map((log, i) => (
                <div key={i}>{log}</div>
            ))}
        </div>
    );
}
