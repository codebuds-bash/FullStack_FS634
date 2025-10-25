import express from "express";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

// ===============================
// Config
// ===============================
const PORT = 5000;
const JWT_SECRET = "supersecurebanksecret"; // use env var in production

// ===============================
// Middleware: Request Logger
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
    req.user = user; // attach user data to request
    next();
  });
};

// ===============================
// Apply Middleware
// ===============================
app.use(logger);

// ===============================
// Routes
// ===============================

// Public route - Login to get JWT
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Dummy user validation
  if (username === "dhruv" && password === "secure123") {
    const user = { username, role: "customer" };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful ✅", token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Protected route - check balance
app.get("/balance", authenticateJWT, (req, res) => {
  res.json({
    user: req.user.username,
    balance: "₹25,000.00",
  });
});

// Protected route - make a transfer
app.post("/transfer", authenticateJWT, (req, res) => {
  const { toAccount, amount } = req.body;

  if (!toAccount || !amount) {
    return res.status(400).json({ error: "Missing transfer details" });
  }

  res.json({
    message: "Transfer successful ✅",
    from: req.user.username,
    to: toAccount,
    amount: `₹${amount}`,
  });
});

// Default route
app.get("/", (req, res) => {
  res.send("🏦 Welcome to Secure Banking API");
});

// ===============================
// Server Start
// ===============================
app.listen(PORT, () =>
  console.log(`Server running securely on http://localhost:${PORT}`)
);
