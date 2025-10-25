// ===============================
// App.jsx
// ===============================
import { Provider, useDispatch, useSelector } from "react-redux";
import { store, addToCart, removeFromCart, clearCart } from "./cartSlice";

function Cart() {
  const dispatch = useDispatch();
  const { items, totalAmount, totalQuantity } = useSelector((state) => state.cart);

  const sampleProducts = [
    { id: 1, title: "Laptop", price: 50000 },
    { id: 2, title: "Headphones", price: 3000 },
    { id: 3, title: "Keyboard", price: 1500 },
  ];

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", padding: "2rem" }}>
      <h2>🛒 Shopping Cart with Redux Toolkit</h2>

      <h3>Products</h3>
      {sampleProducts.map((p) => (
        <div key={p.id} style={{ marginBottom: "1rem" }}>
          <strong>{p.title}</strong> - ₹{p.price}
          <button
            style={{ marginLeft: "1rem" }}
            onClick={() => dispatch(addToCart(p))}
          >
            Add to Cart
          </button>
        </div>
      ))}

      <hr />

      <h3>Cart Summary</h3>
      {items.length === 0 ? (
        <p>🛍️ Cart is empty</p>
      ) : (
        <ul>
          {items.map((i) => (
            <li key={i.id}>
              {i.title} × {i.quantity} = ₹{i.totalPrice}{" "}
              <button onClick={() => dispatch(removeFromCart(i.id))}>−</button>
            </li>
          ))}
        </ul>
      )}

      <p>
        <strong>Total Items:</strong> {totalQuantity}
      </p>
      <p>
        <strong>Total Amount:</strong> ₹{totalAmount}
      </p>

      <button onClick={() => dispatch(clearCart())}>Clear Cart</button>
    </div>
  );
}

// Wrap App with Provider
export default function App() {
  return (
    <Provider store={store}>
      <Cart />
    </Provider>
  );
}
    