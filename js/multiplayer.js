let socket = null;

export function connectSocket(serverUrl) {
  socket = io(serverUrl, { autoConnect: false });
  socket.connect();
  socket.on('connect', () => console.log('Multiplayer connected:', socket.id));
  socket.on('remote-dance', (data) => {
    console.log('Remote player danced:', data);
    // Could trigger particle effects or avatar animations here
  });
}

export function sendDanceEvent(roomId, event) {
  if (socket && socket.connected) {
    socket.emit('dance-event', roomId, event);
  }
}

export function joinRoom(roomId, playerName) {
  if (socket) socket.emit('join-room', roomId, playerName);
}