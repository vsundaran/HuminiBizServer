const { Server } = require('socket.io');
const socketAuthMiddleware = require('./socketAuth');
const SOCKET_EVENTS = require('./events');
const userHandlers = require('./handlers/userHandlers');

/**
 * ─── Global Socket.IO Manager ─────────────────────────────────────────────────
 *
 * MNC-grade singleton pattern:
 *   1. Call `initSocketIO(httpServer)` once in server.js
 *   2. Call `getIO()` anywhere in services / jobs to emit events
 *   3. Use `emitToOrg(orgId, event, payload)` for org-scoped broadcasts
 *   4. Use `emitToUser(userId, event, payload)` for direct user messages
 */

let _io = null;

// userId → socketId map for direct user targeting
const userSocketMap = new Map(); // userId → socketId

/**
 * Initialize Socket.IO, attach auth middleware, and wire event handlers.
 * Must be called once after the HTTP server is created in server.js.
 */
const initSocketIO = (httpServer) => {
  _io = new Server(httpServer, {
    cors: {
      origin: '*', // Tighten in production
      methods: ['GET', 'POST'],
    },
    // WhatsApp/FB-style: prefer WebSocket transport, fallback to polling
    transports: ['websocket', 'polling'],
    // Ping settings for mobile clients (aggressive keep-alive)
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ── Global Authentication Middleware ──────────────────────────────────────
  _io.use(socketAuthMiddleware);

  // ── Connection Handler ────────────────────────────────────────────────────
  _io.on('connection', (socket) => {
    const { userId, organizationId } = socket;

    console.log(`⚡ Socket connected: ${socket.id} | userId: ${userId}`);

    // Track userId → socketId
    userSocketMap.set(userId, socket.id);

    // Auto-join the org room for scoped broadcasts
    socket.join(`org:${organizationId}`);

    // Confirm connection to client
    socket.emit(SOCKET_EVENTS.CONNECT_ACK, {
      message: 'Connected to HuminiBiz socket server',
      socketId: socket.id,
    });

    // Wire domain-specific event handlers
    userHandlers(socket, _io, userSocketMap);

    // ── Disconnect Cleanup ──────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} | userId: ${userId} | reason: ${reason}`);
      userSocketMap.delete(userId);
      const CallService = require('../services/CallService');
      CallService.handleUserDisconnect(userId, organizationId);
    });
  });

  console.log('✅ Socket.IO initialized');
  return _io;
};

/**
 * Returns the Socket.IO server instance.
 * Throws if called before `initSocketIO`.
 */
const getIO = () => {
  if (!_io) {
    throw new Error('Socket.IO has not been initialized. Call initSocketIO(httpServer) first.');
  }
  return _io;
};

/**
 * Broadcast an event to all sockets in an organization's room.
 * Safe to call even if no one is connected (Socket.IO handles empty rooms gracefully).
 *
 * @param {string} organizationId
 * @param {string} event    - Use SOCKET_EVENTS constants
 * @param {object} payload
 */
const emitToOrg = (organizationId, event, payload) => {
  try {
    const io = getIO();
    io.to(`org:${organizationId}`).emit(event, payload);
  } catch (err) {
    // Socket.IO not initialized yet (e.g., during unit tests) — fail silently
    console.warn('[SocketManager] emitToOrg skipped:', err.message);
  }
};

/**
 * Send an event to a specific user's socket directly.
 * No-op if the user is not currently connected.
 *
 * @param {string} userId
 * @param {string} event
 * @param {object} payload
 */
const emitToUser = (userId, event, payload) => {
  try {
    const io = getIO();
    const socketId = userSocketMap.get(String(userId));
    if (socketId) {
      console.log(`📡 [SocketManager] Emitting ${event} to user ${userId} on socket ${socketId}`);
      io.to(socketId).emit(event, payload);
    } else {
      console.warn(`⚠️ [SocketManager] emitToUser failed: No socket connected for user ${userId}`);
    }
  } catch (err) {
    console.warn('[SocketManager] emitToUser skipped:', err.message);
  }
};

/**
 * Returns the socket ID for a connected user, or undefined if offline.
 */
const getSocketIdForUser = (userId) => userSocketMap.get(String(userId));

module.exports = {
  initSocketIO,
  getIO,
  emitToOrg,
  emitToUser,
  getSocketIdForUser,
};
