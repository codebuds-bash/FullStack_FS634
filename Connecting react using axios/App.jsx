// ===============================
// App.jsx
// ===============================
import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

function App() {
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState(null);
  const [form, setForm] = useState({ from: "dhruv", to: "ashish", amount: "" });
  const [response, setResponse] = useState("");

  // Fetch welcome message
  useEffect(() => {
    axios
      .get(`${API_URL}/message`)
      .then((res) => setMessage(res.data.text))
      .catch((err) => console.error("Error:", err));
  }, []);

  // Fetch user balance
  const getBalance = async (username) => {
    try {
      const res = await axios.get(`${API_URL}/balance/${username}`);
      setBalance(res.data.balance);
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  };

  // Handle transfer
  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/transfer`, {
        from: form.from,
        to: form.to,
        amount: parseFloat(form.amount),
      });
      setResponse(res.data.message);
      getBalance(form.from);
    } catch (err) {
      setResponse(err.response?.data?.error || "Transfer failed ❌");
    }
  };

  // On load, get initial balance
  useEffect(() => {
    getBalance("dhruv");
  }, []);

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", padding: "2rem" }}>
      <h2>💸 Account Transfer System</h2>
      <p>{message}</p>

      <h3>Current Balance (Dhruv): ₹{balance ?? "Loading..."}</h3>

      <form onSubmit={handleTransfer} style={{ marginTop: "1rem" }}>
        <input
          type="text"
          placeholder="From"
          value={form.from}
          onChange={(e) => setForm({ ...form, from: e.target.value })}
        />
        <input
          type="text"
          placeholder="To"
          value={form.to}
          onChange={(e) => setForm({ ...form, to: e.target.value })}
        />
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <button type="submit">Transfer</button>
      </form>

      <p style={{ marginTop: "1rem", color: "green" }}>{response}</p>
    </div>
  );
}

export default App;
