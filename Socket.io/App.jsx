// App.jsx
// React client using socket.io-client
// Run: npm install socket.io-client
// Use inside a React app (Vite or CRA). This is a single-file component example.

import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000"; // change for production
const socketOptions = {
  reconnectionAttempts: 5,
  transports: ["websocket"],
};

export default function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("general");
  const [joined, setJoined] = useState(false);

  const [users, setUsers] = useState([]); // {socketId, username}
  const [messages, setMessages] = useState([]); // message objects
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState({}); // map socketId->username

  const messageListRef = useRef(null);
  const typingTimeoutRef = useRef({}); // per-socket timer

  // initialize socket once
  useEffect(() => {
    const s = io(SOCKET_URL, socketOptions);
    setSocket(s);

    s.on("connect", () => {
      console.log("connected", s.id);
      setConnected(true);
    });

    s.on("disconnect", (reason) => {
      console.log("disconnected", reason);
      setConnected(false);
      setJoined(false);
      setUsers([]);
      setMessages((m) => m.concat({ system: true, text: "Disconnected from server" }));
    });

    // incoming public message
    s.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // incoming private message
    s.on("privateMessage", (msg) => {
      setMessages((prev) => [...prev, { ...msg, private: true }]);
    });

    s.on("roomUsers", (roomUsers) => {
      setUsers(roomUsers);
    });

    s.on("userJoined", ({ socketId, username }) => {
      setMessages((prev) => [...prev, { system: true, text: `${username} joined the room` }]);
    });

    s.on("userLeft", ({ socketId, username }) => {
      setMessages((prev) => [...prev, { system: true, text: `${username || "A user"} left the room` }]);
    });

    s.on("typing", ({ socketId, username, isTyping }) => {
      setTypingUsers((prev) => {
        const copy = { ...prev };
        if (isTyping) copy[socketId] = username;
        else delete copy[socketId];
        return copy;
      });
    });

    // clean up on unmount
    return () => {
      s.disconnect();
    };
  }, []);

  // auto-scroll when messages update
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // join room
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!socket) return;
    if (!username.trim()) {
      alert("Enter a username");
      return;
    }
    // ack will contain users and history
    socket.emit("joinRoom", { room, username }, (res) => {
      if (!res) {
        alert("No response from server");
        return;
      }
      if (res.status === "ok") {
        setUsers(res.users || []);
        setMessages(res.history || []);
        setJoined(true);
      } else {
        alert(res.message || "Failed to join");
      }
    });
  };

  // leave room
  const handleLeave = () => {
    if (!socket) return;
    socket.emit("leaveRoom", { room }, (res) => {
      setJoined(false);
      setUsers([]);
      if (res?.status !== "ok") {
        console.warn("leaveRoom ack:", res);
      }
    });
  };

  // send a message (public by default)
  const sendMessage = (e) => {
    e?.preventDefault?.();
    if (!text.trim() || !socket || !joined) return;
    const toSocketId = null; // for simple example; you can set to selected user id for private
    socket.emit("sendMessage", { room, text: text.trim(), toSocketId }, (ack) => {
      if (ack?.status !== "ok") {
        console.warn("Message not delivered:", ack);
      }
    });
    setText("");
    sendTyping(false);
  };

  // send private message to a user
  const sendPrivate = (toSocketId) => {
    if (!text.trim() || !socket || !joined) return;
    socket.emit("sendMessage", { room, text: text.trim(), toSocketId }, (ack) => {
      if (ack?.status !== "ok") {
        console.warn("Private message failed:", ack);
      }
    });
    setText("");
    sendTyping(false);
  };

  // typing indicator
  const sendTyping = (isTyping) => {
    if (!socket || !joined) return;
    socket.emit("typing", { room, isTyping });
  };

  // local handler for input changes to send typing events with debounce
  const handleInputChange = (val) => {
    setText(val);
    if (!socket || !joined) return;

    sendTyping(true);

    // clear any existing timeout for this socket's typing indicator
    if (typingTimeoutRef.current.typingTimer) {
      clearTimeout(typingTimeoutRef.current.typingTimer);
    }
    typingTimeoutRef.current.typingTimer = setTimeout(() => {
      sendTyping(false);
    }, 800); // stop typing after 800ms of inactivity
  };

  return (
    <div style={styles.app}>
      <div style={styles.leftPanel}>
        <h3>Real-Time Chat</h3>
        <p style={{ fontSize: 12, color: "#666" }}>
          {connected ? "Connected" : "Disconnected"}
        </p>

        {!joined ? (
          <form onSubmit={handleJoin} style={styles.form}>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
            />
            <input
              placeholder="Room (e.g., general)"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.button}>Join Room</button>
          </form>
        ) : (
          <div>
            <p><strong>Room:</strong> {room}</p>
            <button onClick={handleLeave} style={styles.buttonSecondary}>Leave Room</button>

            <div style={{ marginTop: 16 }}>
              <strong>Users in room</strong>
              <ul>
                {users.map((u) => (
                  <li key={u.socketId}>
                    {u.username} {u.socketId === socket?.id ? "(you)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.messagesHeader}>
          <div>Chat — {room}</div>
          <div style={{ fontSize: 12, color: "#666" }}>{Object.keys(typingUsers).length > 0 ? `${Object.values(typingUsers).join(", ")} typing...` : ""}</div>
        </div>

        <div ref={messageListRef} style={styles.messageList}>
          {messages.map((m) => (
            <div key={m.id || Math.random()} style={m.system ? styles.systemMsg : (m.fromSocketId === socket?.id ? styles.ownMsg : styles.msg)}>
              {m.system ? (
                <em style={{ color: "#666" }}>{m.text}</em>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "#333" }}>
                    <strong>{m.username}</strong> <span style={{ fontSize: 11, color: "#999" }}>{new Date(m.ts).toLocaleTimeString()}</span>
                    {m.private ? <span style={{ marginLeft: 8, fontSize: 11, color: "#b32d2d" }}>(private)</span> : null}
                  </div>
                  <div style={{ marginTop: 6 }}>{m.text}</div>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} style={styles.composer}>
          <input
            value={text}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={joined ? "Type a message..." : "Join a room to chat"}
            style={styles.inputMessage}
            disabled={!joined}
          />
          <button type="submit" style={styles.sendBtn} disabled={!joined || !text.trim()}>Send</button>
        </form>

        <div style={{ marginTop: 8 }}>
          <small style={{ color: "#666" }}>Tip: click a username in the list to open private message (not implemented UI here). For demo, modify sendPrivate(toSocketId).</small>
        </div>
      </div>
    </div>
  );
}

// Minimal inline styles
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  },
  leftPanel: {
    width: 280,
    borderRight: "1px solid #eee",
    padding: 20,
    boxSizing: "border-box",
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: 20,
    boxSizing: "border-box",
  },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  input: { padding: 8, borderRadius: 6, border: "1px solid #ddd" },
  button: { padding: "8px 12px", marginTop: 6, borderRadius: 6, cursor: "pointer" },
  buttonSecondary: { padding: "6px 10px", marginTop: 6, borderRadius: 6, cursor: "pointer", background: "#f2f2f2" },
  messagesHeader: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  messageList: { flex: 1, overflowY: "auto", padding: 8, background: "#fafafa", borderRadius: 6 },
  msg: { padding: 8, background: "#fff", marginBottom: 8, borderRadius: 8, maxWidth: "70%" },
  ownMsg: { padding: 8, background: "#dcf8c6", marginBottom: 8, borderRadius: 8, alignSelf: "flex-end", maxWidth: "70%" },
  systemMsg: { padding: 8, textAlign: "center", color: "#666", fontStyle: "italic", marginBottom: 8 },
  composer: { display: "flex", gap: 8, marginTop: 12 },
  inputMessage: { flex: 1, padding: 10, borderRadius: 6, border: "1px solid #ddd" },
  sendBtn: { padding: "10px 14px", borderRadius: 6, cursor: "pointer" },
};
