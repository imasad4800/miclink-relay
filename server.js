const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const listeners = {};

// Sender streams audio via persistent chunked POST
app.post('/stream/:room', (req, res) => {
    const room = req.params.room;
    console.log(`[+] Sender connected to room: ${room}`);

    req.on('data', chunk => {
        // Forward each chunk instantly to all listeners
        if (listeners[room] && listeners[room].length > 0) {
            listeners[room].forEach(listenerRes => {
                try { listenerRes.write(chunk); } catch (e) {}
            });
        }
    });

    req.on('end', () => {
        console.log(`[-] Sender disconnected from room: ${room}`);
        res.status(200).send('ok');
    });

    req.on('error', (e) => {
        console.log(`[!] Sender error in room ${room}: ${e.message}`);
        res.status(500).send('error');
    });
});

// Listener connects and receives audio stream
app.get('/listen/:room', (req, res) => {
    const room = req.params.room;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!listeners[room]) listeners[room] = [];
    listeners[room].push(res);
    console.log(`[+] Listener connected to room: ${room} (total: ${listeners[room].length})`);

    req.on('close', () => {
        if (listeners[room]) {
            listeners[room] = listeners[room].filter(r => r !== res);
            console.log(`[-] Listener disconnected from room: ${room}`);
        }
    });
});

app.get('/', (req, res) => res.send('MicLink Relay Online ✓'));

app.listen(PORT, () => console.log(`MicLink relay running on port ${PORT}`));
