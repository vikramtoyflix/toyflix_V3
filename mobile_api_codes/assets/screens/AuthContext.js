import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // For loading states

  useEffect(() => {
    // Listen for Firebase authentication state changes
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Store user session in AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(firebaseUser.toJSON()));
      } else {
        setUser(null);
        await AsyncStorage.removeItem('user');
      }
      setLoading(false); // Stop loading once the user session is determined
    });

    // Check for any stored session on component mount
    const loadUserSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser)); // Set stored user
        }
      } catch (error) {
        console.error('Failed to load user session:', error);
      }
      setLoading(false); // Stop loading even if there's no user
    };

    loadUserSession();

    return () => unsubscribe(); // Clean up Firebase subscription
  }, []);

  const login = async (userData) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      console.log('User logged in:', userData);
    } catch (error) {
      console.error('Failed to save user session:', error);
    }
  };

  const logout = async () => {
    try {
      await auth().signOut(); // Firebase sign-out
      await AsyncStorage.removeItem('user');
      setUser(null);
      console.log('User logged out');
    } catch (error) {
      console.error('Failed to clear user session:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
