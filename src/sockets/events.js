/**
 * ─── WebSocket Event Registry ────────────────────────────────────────────────
 *
 * This is the SINGLE SOURCE OF TRUTH for all Socket.IO event names used by
 * the HuminiBiz server. Mirror any changes to the client's events.ts file.
 *
 * Naming convention: UPPER_SNAKE_CASE
 */

const SOCKET_EVENTS = {
  // ─── Connection Lifecycle ──────────────────────────────────────────────
  /** Emitted to client upon successful authenticated connection */
  CONNECT_ACK: 'connect_ack',

  /** Client emits to join their organization's broadcast room */
  JOIN_ORG_ROOM: 'join_org_room',

  /** Client emits on disconnect (handled automatically by Socket.IO too) */
  DISCONNECT: 'disconnect',

  // ─── Presence / Status ─────────────────────────────────────────────────
  /**
   * Server → Client (org room broadcast)
   * Emitted whenever a user's call availability changes.
   *
   * Payload: { userId: string, organizationId: string, isInCall: boolean }
   */
  USER_CALL_STATUS_CHANGED: 'user_call_status_changed',

  // ─── Call Signaling ────────────────────────────────────────────────────
  /**
   * Server → specific callee socket
   * Notifies the receiver that an incoming call has been placed.
   *
   * Payload: { callId, callerId, callerName, momentId, channelName, agoraAppId, token }
   */
  INCOMING_CALL: 'incoming_call',

  /**
   * Server → specific caller socket
   * Notifies the caller that the receiver accepted.
   *
   * Payload: { callId, channelName, token, agoraAppId }
   */
  CALL_ACCEPTED: 'call_accepted',

  /**
   * Server → specific caller socket
   * Notifies the caller that the receiver declined.
   *
   * Payload: { callId }
   */
  CALL_DECLINED: 'call_declined',

  /**
   * Server → both sockets
   * Notifies both parties that the call ended.
   *
   * Payload: { callId }
   */
  CALL_ENDED: 'call_ended',

  /**
   * Server → caller socket
   * Notifies the caller that the call timed out (missed).
   *
   * Payload: { callId }
   */
  CALL_MISSED: 'call_missed',
};

module.exports = SOCKET_EVENTS;
