const SOCKET_EVENTS = require('../events');

/**
 * ─── User Event Handlers ──────────────────────────────────────────────────────
 *
 * Handles per-connection user events.
 * Called once per connected socket in socketManager's `connection` handler.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @param {Map} userSocketMap - shared userId → socketId reference
 */
const userHandlers = (socket, io, userSocketMap) => {
  // ── JOIN_ORG_ROOM (Manual override / re-join) ────────────────────────────
  // Normally, the org room join happens automatically on connection.
  // This handler allows re-joining after a temporary disconnect.
  socket.on(SOCKET_EVENTS.JOIN_ORG_ROOM, ({ organizationId }) => {
    if (!organizationId) return;
    const room = `org:${organizationId}`;
    socket.join(room);
    console.log(`👥 Socket ${socket.id} joined room: ${room}`);
  });
};

module.exports = userHandlers;
