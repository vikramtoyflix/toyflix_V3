import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import axios from 'axios';

const API = () => {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [jsonResponse, setJsonResponse] = useState(null);
  
    useEffect(() => {
      const fetchProduct = async () => {
        try {
          const response = await axios.get('https://toyflix.in/wp-json/api/v1/products');
          
          // Log and set the JSON response
        //   console.log('API Response:', response);
        //   console.log('API Response Data:', response.data);
  
          // Set JSON response for display
          setJsonResponse(JSON.stringify(response.data, null, 2));
  
          const data = response.data;
  
          // Handle the response based on the provided structure
          if (data && data.status === 200 && Array.isArray(data.data)) {
            // Response contains an array of products under the 'data' key
            const productId = 9213; // Replace with actual ID or logic
            const productData = data.data.find(p => p.id === productId);
            if (productData) {
              setProduct(productData);
            } else {
              throw new Error(`Product with ID ${productId} not found`);
            }
          } else {
            // Handle unexpected response format
            console.log('Unexpected response format, data:', data);
            throw new Error('Unexpected response format');
          }
          
          setLoading(false);
        } catch (err) {
          console.error('Error fetching product:', err); // Improved error logging
          setError(err);
          setLoading(false);
        }
      };
  
      fetchProduct();
    }, []);
  
    if (loading) {
      return <Text>Loading...</Text>;
    }
  
    if (error) {
      return <Text>Error: {error.message}</Text>;
    }

  return (
    <View contentContainerStyle={styles.container}>
      {jsonResponse && (
        <View style={styles.jsonContainer}>
          <Text style={styles.jsonText}></Text>
        </View>
      )}
      {product && (
        <View style={styles.productContainer}>
          {product.image && <Image source={{ uri: product.image }} style={styles.image} />}
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.description}>{product.description}</Text>
          <Text style={styles.price}>Price: ${product.price}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      padding: 16,
      alignItems: 'center',
    },
    jsonContainer: {
      marginBottom: 16,
      width: '100%',
      padding: 16,
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
    },
    jsonText: {
      fontSize: 12,
      color: '#333',
    },
    productContainer: {
      alignItems: 'center',
    },
    image: {
      width: 200,
      height: 200,
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    description: {
      fontSize: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    price: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
    },
  });

export default API;
