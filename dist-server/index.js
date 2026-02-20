"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const httpServer = (0, http_1.createServer)(app);
// Get configuration from environment or use defaults
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB default
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST']
    },
    maxHttpBufferSize: MAX_FILE_SIZE,
    pingTimeout: 60000,
    pingInterval: 25000
});
const rooms = new Map();
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('create-room', (data, callback) => {
        if (rooms.has(data.roomCode)) {
            callback(false);
            return;
        }
        const userMap = new Map();
        userMap.set(socket.id, { name: data.userName, isHost: true });
        rooms.set(data.roomCode, {
            users: userMap,
            files: [],
            createdAt: Date.now(),
            roomName: data.roomName,
            hostId: socket.id
        });
        socket.join(data.roomCode);
        const usersList = Array.from(userMap.entries()).map(([id, user]) => ({
            id,
            name: user.name,
            isHost: user.isHost
        }));
        io.to(data.roomCode).emit('users-update', usersList);
        console.log(`Room ${data.roomCode} created by ${data.userName}`);
        callback(true);
    });
    socket.on('join-room', (data, callback) => {
        if (!rooms.has(data.roomCode)) {
            callback(false);
            return;
        }
        socket.join(data.roomCode);
        const room = rooms.get(data.roomCode);
        room.users.set(socket.id, { name: data.userName, isHost: false });
        const usersList = Array.from(room.users.entries()).map(([id, user]) => ({
            id,
            name: user.name,
            isHost: user.isHost
        }));
        io.to(data.roomCode).emit('users-update', usersList);
        console.log(`User ${data.userName} joined room ${data.roomCode}`);
        callback(true, { files: room.files, roomName: room.roomName });
    });
    socket.on('share-file', ({ roomCode, fileData }) => {
        const room = rooms.get(roomCode);
        if (room) {
            // Validate file size
            const fileSize = fileData.size;
            if (fileSize > MAX_FILE_SIZE) {
                socket.emit('file-error', { message: 'File too large' });
                return;
            }
            room.files.push(fileData);
            socket.to(roomCode).emit('file-shared', fileData);
            console.log(`File ${fileData.name} (${(fileSize / (1024 * 1024)).toFixed(2)}MB) shared in room ${roomCode}`);
        }
    });
    socket.on('delete-file', ({ roomCode, fileId }) => {
        const room = rooms.get(roomCode);
        if (room) {
            room.files = room.files.filter(f => f.id !== fileId);
            io.to(roomCode).emit('file-deleted', fileId);
            console.log(`File ${fileId} deleted from room ${roomCode}`);
        }
    });
    socket.on('remove-user', ({ roomCode, userId }) => {
        const room = rooms.get(roomCode);
        if (room && room.hostId === socket.id) {
            room.users.delete(userId);
            io.to(userId).emit('user-removed');
            const usersList = Array.from(room.users.entries()).map(([id, user]) => ({
                id,
                name: user.name,
                isHost: user.isHost
            }));
            io.to(roomCode).emit('users-update', usersList);
            const socketToRemove = io.sockets.sockets.get(userId);
            if (socketToRemove) {
                socketToRemove.leave(roomCode);
            }
            console.log(`User ${userId} removed from room ${roomCode}`);
        }
    });
    socket.on('end-room', (roomCode) => {
        const room = rooms.get(roomCode);
        if (room && room.hostId === socket.id) {
            io.to(roomCode).emit('room-ended');
            rooms.delete(roomCode);
            console.log(`Room ${roomCode} ended by host`);
        }
    });
    socket.on('disconnect', () => {
        rooms.forEach((room, roomCode) => {
            if (room.users.has(socket.id)) {
                const isHostLeaving = room.hostId === socket.id;
                if (isHostLeaving) {
                    io.to(roomCode).emit('room-ended');
                    rooms.delete(roomCode);
                    console.log(`Room ${roomCode} ended (host left)`);
                }
                else {
                    room.users.delete(socket.id);
                    const usersList = Array.from(room.users.entries()).map(([id, user]) => ({
                        id,
                        name: user.name,
                        isHost: user.isHost
                    }));
                    io.to(roomCode).emit('users-update', usersList);
                    if (room.users.size === 0) {
                        setTimeout(() => {
                            const currentRoom = rooms.get(roomCode);
                            if (currentRoom && currentRoom.users.size === 0) {
                                rooms.delete(roomCode);
                                console.log(`Room ${roomCode} deleted (empty)`);
                            }
                        }, 60000);
                    }
                }
            }
        });
        console.log('User disconnected:', socket.id);
    });
});
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Max file size: ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`);
});
