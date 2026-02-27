import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';

const Products = ({ subcategoryId }) => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`https://toyflix.in/wp-json/custom-api/v1/get-mapped-category-data/?subcategory_id=${subcategoryId}`);
        setProducts(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    if (subcategoryId) {
      fetchProducts();
    }
  }, [subcategoryId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <Text style={styles.product}>{item.name}</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  product: {
    padding: 15,
    backgroundColor: '#cce7ff',
    marginVertical: 5,
    borderRadius: 5,
  },
});

export default Products;
