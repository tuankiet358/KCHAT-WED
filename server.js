const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store users and messages
const users = new Map();
const messages = [];
const MAX_MESSAGES = 100;

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // User joins
    socket.on('join', (username) => {
        const user = {
            id: socket.id,
            username: username || `User${Math.floor(Math.random() * 10000)}`,
            joinedAt: new Date()
        };
        
        users.set(socket.id, user);
        
        // Send welcome message
        socket.emit('systemMessage', {
            text: `Chào mừng ${user.username} đến với KCHAT! 🎉`,
            type: 'welcome'
        });

        // Notify others
        socket.broadcast.emit('userJoined', user.username);

        // Send user list and history
        io.emit('userList', Array.from(users.values()));
        socket.emit('messageHistory', messages.slice(-50));
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const message = {
            id: Date.now(),
            author: user.username,
            text: data.text,
            timestamp: new Date(),
            avatarColor: data.avatarColor || '#5865f2'
        };

        messages.push(message);
        if (messages.length > MAX_MESSAGES) {
            messages.shift();
        }

        // Broadcast to all users
        io.emit('newMessage', message);
    });

    // Handle typing indicator
    socket.on('typing', (isTyping) => {
        const user = users.get(socket.id);
        if (user) {
            socket.broadcast.emit('userTyping', {
                username: user.username,
                isTyping
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            socket.broadcast.emit('userLeft', user.username);
            users.delete(socket.id);
            io.emit('userList', Array.from(users.values()));
            console.log('👤 User disconnected:', user.username);
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 KCHAT Server running on http://localhost:${PORT}`);
    console.log(`📱 Public URL: https://kchat.onrender.com (sau khi deploy)`);
});
