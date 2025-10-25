// ===============================
// server.js
// ===============================
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Dummy user data (in-memory)
let accounts = {
  dhruv: { balance: 25000 },
  ashish: { balance: 18000 },
};

// Get welcome message
app.get("/api/message", (req, res) => {
  res.json({ text: "Hello from Express Backend 👋" });
});

// Transfer money route
app.post("/api/transfer", (req, res) => {
  const { from, to, amount } = req.body;

  if (!from || !to || !amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid transfer details" });
  }

  const sender = accounts[from];
  const receiver = accounts[to];

  if (!sender || !receiver) {
    return res.status(404).json({ error: "Account not found" });
  }

  if (sender.balance < amount) {
    return res.status(400).json({ error: "Insufficient balance ❌" });
  }

  sender.balance -= amount;
  receiver.balance += amount;

  res.json({
    message: `Transfer successful ✅ ₹${amount} from ${from} to ${to}`,
    remainingBalance: sender.balance,
  });
});

// Get balance
app.get("/api/balance/:username", (req, res) => {
  const { username } = req.params;
  const account = accounts[username];
  if (!account) return res.status(404).json({ error: "User not found" });
  res.json({ username, balance: account.balance });
});

const PORT = 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
