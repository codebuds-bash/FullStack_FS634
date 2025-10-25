// ===============================
// cartSlice.js
// ===============================
import { createSlice, configureStore } from "@reduxjs/toolkit";

const initialState = {
  items: [],
  totalQuantity: 0,
  totalAmount: 0,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const existingItem = state.items.find((i) => i.id === item.id);

      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.totalPrice += item.price;
      } else {
        state.items.push({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: 1,
          totalPrice: item.price,
        });
      }

      state.totalQuantity += 1;
      state.totalAmount += item.price;
    },
    removeFromCart: (state, action) => {
      const id = action.payload;
      const existingItem = state.items.find((i) => i.id === id);
      if (!existingItem) return;

      state.totalQuantity -= 1;
      state.totalAmount -= existingItem.price;

      if (existingItem.quantity === 1) {
        state.items = state.items.filter((i) => i.id !== id);
      } else {
        existingItem.quantity -= 1;
        existingItem.totalPrice -= existingItem.price;
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.totalQuantity = 0;
      state.totalAmount = 0;
    },
  },
});

export const { addToCart, removeFromCart, clearCart } = cartSlice.actions;

// Create and export store
export const store = configureStore({
  reducer: { cart: cartSlice.reducer },
});
