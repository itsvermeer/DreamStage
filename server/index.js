const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, playerName) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, name: playerName });
    io.to(roomId).emit('player-list', rooms[roomId]);
  });

  socket.on('dance-event', (roomId, event) => {
    socket.to(roomId).emit('remote-dance', { id: socket.id, ...event });
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(p => p.id !== socket.id);
      io.to(roomId).emit('player-list', rooms[roomId]);
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('DreamStage server running on port', process.env.PORT || 3000);
});