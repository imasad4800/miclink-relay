// MicLink Relay Server
// Deploy this FREE on Glitch.com (glitch.com/new) — paste this as server.js
// No credit card needed, free forever for small use

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Store active audio buffers per room
const rooms = {};      // roomName -> array of pending audio chunks
const listeners = {};  // roomName -> array of response objects (SSE connections)

// ── Sender pushes audio chunks here ──
app.post('/stream/:room', (req, res) => {
    const room = req.params.room;
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        const audioData = Buffer.concat(chunks);

        // Forward to all active listeners in this room
        if (listeners[room] && listeners[room].length > 0) {
            listeners[room].forEach(listenerRes => {
                try {
                    listenerRes.write(audioData);
                } catch (e) {
                    // Listener disconnected, will be cleaned up
                }
            });
        }

        res.status(200).send('ok');
    });

    req.on('error', () => res.status(400).send('error'));
});

// ── Listener connects here and receives audio stream ──
app.get('/listen/:room', (req, res) => {
    const room = req.params.room;

    // Set up chunked streaming response
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Register this listener
    if (!listeners[room]) listeners[room] = [];
    listeners[room].push(res);

    console.log(`[+] Listener connected to room: ${room} (${listeners[room].length} total)`);

    // Clean up when listener disconnects
    req.on('close', () => {
        if (listeners[room]) {
            listeners[room] = listeners[room].filter(r => r !== res);
            console.log(`[-] Listener disconnected from room: ${room}`);
        }
    });
});

// Health check
app.get('/', (req, res) => res.send('MicLink Relay Online ✓'));

app.listen(PORT, () => console.log(`MicLink relay running on port ${PORT}`));
