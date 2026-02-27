import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Cart = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCartProducts = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          throw new Error('Token not found');
        }

        const response = await axios.get('https://toyflix.in/wp-json/api/v1/cart', {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          params: {
            token: token,
          },
        });

        if (response.data.status === 'success') {
          setProducts(response.data.products);
        } else {
          setError('Failed to retrieve products');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCartProducts();
  }, []);

  const renderProduct = ({ item }) => (
    <View style={styles.productContainer}>
      <Text style={styles.productName}>{item.product_name}</Text>
      <Text style={styles.productQuantity}>Quantity: {item.quantity}</Text>
      <Text style={styles.productPrice}>
        Price: {item.price.replace(/<[^>]*>/g, '')} {/* Clean price */}
      </Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.product_id.toString()}
      renderItem={renderProduct}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  productContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productQuantity: {
    fontSize: 16,
    color: '#555',
  },
  productPrice: {
    fontSize: 16,
    color: '#000',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default Cart;
