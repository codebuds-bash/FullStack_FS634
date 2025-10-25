import express from "express";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

// ===============================
// Config
// ===============================
const PORT = 5000;
const JWT_SECRET = "securebanksecret"; // In production, store in environment variable

// ===============================
// Mock Database (In-Memory)
// ===============================
const accounts = {
  dhruv: { username: "dhruv", password: "secure123", balance: 25000 },
  ashish: { username: "ashish", password: "pass456", balance: 18000 },
  vishakha: { username: "vishakha", password: "mypwd", balance: 30000 },
};

// ===============================
// Middleware: Logger
// ===============================
const logger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
};

// ===============================
// Middleware: JWT Authentication
// ===============================
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

// ===============================
// Apply Logger Middleware
// ===============================
app.use(logger);

// ===============================
// Routes
// ===============================

// Root
app.get("/", (req, res) => {
  res.send("💸 Welcome to Secure Account Transfer System");
});

// Login - Get JWT Token
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const account = accounts[username];

  if (!account || account.password !== password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ message: "Login successful ✅", token });
});

// Check Balance
app.get("/balance", authenticateJWT, (req, res) => {
  const account = accounts[req.user.username];
  res.json({ username: account.username, balance: account.balance });
});

// Transfer Money
app.post("/transfer", authenticateJWT, (req, res) => {
  const { toAccount, amount } = req.body;
  const fromUser = req.user.username;

  // Basic validation
  if (!toAccount || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "Invalid transfer details" });
  }

  const sender = accounts[fromUser];
  const receiver = accounts[toAccount];

  if (!receiver) {
    return res.status(404).json({ error: "Receiver account not found" });
  }

  // Check sufficient balance
  if (sender.balance < amount) {
    return res.status(400).json({
      error: "Insufficient balance ❌",
      currentBalance: sender.balance,
    });
  }

  // Perform transfer
  sender.balance -= amount;
  receiver.balance += amount;

  res.json({
    message: "Transfer successful ✅",
    from: fromUser,
    to: toAccount,
    amount,
    remainingBalance: sender.balance,
  });
});

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`Server running securely on http://localhost:${PORT}`);
});
