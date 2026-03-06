const jwt = require('jsonwebtoken');

/**
 * ─── Socket.IO Authentication Middleware ─────────────────────────────────────
 *
 * Validates the JWT token sent by the client in the `auth` handshake field.
 * Compatible with socket.io-client v4 options: { auth: { token: '...' } }
 *
 * On success: attaches `socket.userId` and `socket.organizationId` for use in handlers.
 * On failure: calls next() with an Error to reject the connection.
 */
const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user context to the socket for access in event handlers
    socket.userId = decoded.id;
    socket.organizationId = decoded.organizationId;
    socket.userRole = decoded.role;
    console.log(`🔑 [SocketAuth] Verified socket ${socket.id} for user ${socket.userId}`);
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid or expired token'));
  }
};

module.exports = socketAuthMiddleware;
