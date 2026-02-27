import React, { createContext, useState, useContext } from 'react';

// Create a Cart Context
const CartContext = createContext();

// Hook to use the Cart context
export const useCart = () => useContext(CartContext);
const MembershipContext = createContext();
 
// Cart Provider component to wrap your app
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Add item to the cart (or increase quantity if already in cart)
  const addItemToCart = (items) => {
    if (cart.length >= 4) {
    // Show an error when cart is full
    alert('Cart is full. You can only add up to 4 items.');
    return;
  }
    // Check if items is an array, if not, convert to an array
    const itemsToAdd = Array.isArray(items) ? items : [items];
    
    console.log("Adding items to cart:", itemsToAdd); // Log the items being added

    setCart((prevCart) => {
      // Create a copy of the previous cart
      const newCart = [...prevCart];

      itemsToAdd.forEach(item => {
        const existingItem = newCart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
          // Increase quantity if item exists
          existingItem.quantity += 1;
        } else {
          // Add new item to the cart
          newCart.push({ ...item, quantity: 1 });
        }
      });

      return newCart;
    });
  };

  // Remove item from the cart (decrease quantity or remove if quantity reaches 0)
  const removeItemFromCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      
      // If for some reason the quantity is undefined, set it to 1
      if (existingItem && typeof existingItem.quantity !== 'number') {
        existingItem.quantity = 1;
      }

      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem
        );
      } else {
        return prevCart.filter(cartItem => cartItem.id !== item.id);
      }
    });
  };

  // Completely delete item from the cart
  const deleteItemFromCart = (item) => {
    setCart((prevCart) => prevCart.filter(cartItem => cartItem.id !== item.id));
  };

  // Clear all items from the cart
  const clearCart = () => {
    setCart([]);
  };

  // Calculate the total number of items in the cart
  const cartLength = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addItemToCart, removeItemFromCart, deleteItemFromCart, clearCart, cartLength }}>
      {children}
    </CartContext.Provider>
  );
};

// Create a provider component
export const MembershipProvider = ({ children }) => {
    const [membershipPrice, setMembershipPrice] = useState(null);

    return (
        <MembershipContext.Provider value={{ membershipPrice, setMembershipPrice }}>
            {children}
        </MembershipContext.Provider>
    );
};
export const useMembership = () => {
  return useContext(MembershipContext);
};
