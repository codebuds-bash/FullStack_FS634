import express from "express";

const app = express();
app.use(express.json());

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
// Middleware: Bearer Token Authentication
// ===============================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  const VALID_TOKEN = "mysecrettoken123"; // Replace with real token or JWT verification

  if (token !== VALID_TOKEN) {
    return res.status(403).json({ error: "Invalid token" });
  }

  next();
};

// ===============================
// Apply Middleware
// ===============================
app.use(logger);

// ===============================
// Routes
// ===============================
app.get("/", (req, res) => {
  res.send("Welcome to Middleware Demo 🚀");
});

app.get("/secure", authenticateToken, (req, res) => {
  res.json({ message: "Access granted ✅", user: "Dhruv" });
});

// ===============================
// Server Start
// ===============================
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
