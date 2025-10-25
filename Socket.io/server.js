// server.js
// Run: npm install express socket.io cors
// Start: node server.js

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Restrict in production to your frontend origin
    methods: ["GET", "POST"]
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Simple in-memory stores (swap for DB in production)
const rooms = {}; // { roomName: { users: {socketId: username}, messages: [{id, username, text, ts, to}] } }

// Helper
const safeRoomInit = (room) => {
  if (!rooms[room]) rooms[room] = { users: {}, messages: [] };
};

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // join room event
  socket.on("joinRoom", ({ room, username }, ack) => {
    try {
      if (!room || !username) {
        ack?.({ status: "error", message: "room and username required" });
        return;
      }

      safeRoomInit(room);

      // Save user
      rooms[room].users[socket.id] = username;
      socket.join(room);

      // Notify existing users
      socket.to(room).emit("userJoined", { socketId: socket.id, username });

      // Send room state to the joining user
      const users = Object.entries(rooms[room].users).map(([id, name]) => ({ socketId: id, username: name }));
      const history = rooms[room].messages.slice(-100); // last 100 messages
      ack?.({ status: "ok", users, history });

      // Broadcast updated user list
      io.in(room).emit("roomUsers", users);

      console.log(`${username} joined ${room}`);
    } catch (err) {
      console.error("joinRoom error:", err);
      ack?.({ status: "error", message: "internal error" });
    }
  });

  // handle sendMessage (public to room or private if toSocketId provided)
  socket.on("sendMessage", ({ room, text, toSocketId }, ack) => {
    try {
      if (!room || !text) {
        ack?.({ status: "error", message: "room and text required" });
        return;
      }
      safeRoomInit(room);
      const username = rooms[room].users[socket.id] || "Unknown";

      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        username,
        text,
        ts: Date.now(),
        fromSocketId: socket.id,
        toSocketId: toSocketId || null, // if present -> private
      };

      // Save to history (store private messages as well)
      rooms[room].messages.push(msg);
      if (rooms[room].messages.length > 1000) rooms[room].messages.shift();

      if (toSocketId) {
        // Private: emit to recipient and sender only
        socket.to(toSocketId).emit("privateMessage", msg);
        socket.emit("privateMessage", msg); // echo back to sender
      } else {
        // Public: broadcast to room
        io.in(room).emit("message", msg);
      }

      ack?.({ status: "ok", messageId: msg.id });
    } catch (err) {
      console.error("sendMessage error:", err);
      ack?.({ status: "error", message: "internal error" });
    }
  });

  // typing indicator
  socket.on("typing", ({ room, isTyping }) => {
    try {
      if (!room) return;
      const username = rooms[room]?.users[socket.id] || "Unknown";
      socket.to(room).emit("typing", { socketId: socket.id, username, isTyping });
    } catch (err) {
      console.error("typing error:", err);
    }
  });

  // leave room explicitly
  socket.on("leaveRoom", ({ room }, ack) => {
    try {
      if (!room) {
        ack?.({ status: "error", message: "room required" });
        return;
      }
      socket.leave(room);
      if (rooms[room]) {
        delete rooms[room].users[socket.id];
        const users = Object.entries(rooms[room].users).map(([id, name]) => ({ socketId: id, username: name }));
        io.in(room).emit("roomUsers", users);
        io.in(room).emit("userLeft", { socketId: socket.id });
        if (Object.keys(rooms[room].users).length === 0) {
          // optional: cleanup empty room
          delete rooms[room];
        }
      }
      ack?.({ status: "ok" });
    } catch (err) {
      console.error("leaveRoom error:", err);
      ack?.({ status: "error", message: "internal error" });
    }
  });

  // handle disconnect
  socket.on("disconnect", (reason) => {
    try {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
      // Remove from all rooms it's in
      for (const [roomName, data] of Object.entries(rooms)) {
        if (data.users[socket.id]) {
          const username = data.users[socket.id];
          delete data.users[socket.id];
          io.in(roomName).emit("userLeft", { socketId: socket.id, username });
          const users = Object.entries(data.users).map(([id, name]) => ({ socketId: id, username: name }));
          io.in(roomName).emit("roomUsers", users);
          if (Object.keys(data.users).length === 0) {
            delete rooms[roomName];
          }
          console.log(`${username} removed from ${roomName}`);
        }
      }
    } catch (err) {
      console.error("disconnect cleanup error:", err);
    }
  });
});

// Basic HTTP route for status
app.get("/", (req, res) => {
  res.json({ status: "ok", rooms: Object.keys(rooms).length });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
