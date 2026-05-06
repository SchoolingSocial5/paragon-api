"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSocketIds = exports.unregisterUserSocket = exports.registerUserSocket = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
// Map to track username -> Set of socket IDs
const userSockets = new Map();
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        return null;
    }
    return io;
};
exports.getIO = getIO;
// Register a socket ID for a user
const registerUserSocket = (username, socketId) => {
    var _a;
    const normalizedUsername = username.toLowerCase();
    if (!userSockets.has(normalizedUsername)) {
        userSockets.set(normalizedUsername, new Set());
    }
    (_a = userSockets.get(normalizedUsername)) === null || _a === void 0 ? void 0 : _a.add(socketId);
};
exports.registerUserSocket = registerUserSocket;
// Unregister a socket ID
const unregisterUserSocket = (socketId) => {
    for (const [username, sockets] of userSockets.entries()) {
        if (sockets.has(socketId)) {
            sockets.delete(socketId);
            if (sockets.size === 0) {
                userSockets.delete(username);
            }
            break;
        }
    }
};
exports.unregisterUserSocket = unregisterUserSocket;
// Get all socket IDs for a specific user
const getUserSocketIds = (username) => {
    const normalizedUsername = username.toLowerCase();
    const sockets = userSockets.get(normalizedUsername);
    return sockets ? Array.from(sockets) : [];
};
exports.getUserSocketIds = getUserSocketIds;
