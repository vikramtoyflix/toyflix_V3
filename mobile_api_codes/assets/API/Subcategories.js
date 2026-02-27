import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import axios from 'axios';

const Subcategories = ({ route }) => {
  const { termId } = route.params; // Get the termId from the route params
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tag_id=termId;
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        const response = await axios.get(`https://toyflix.in/wp-json/custom-api/v1/get-mapped-category-data/?tag_id=${tag_id}`);
        console.log('Subcategories Response:', response); // Log the full response
        setSubCategories(response.data.data); // Adjust based on actual response structure
      } catch (err) {
        console.error('Error fetching subcategories:', err);
        setError('Failed to load subcategories.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubCategories();
  }, [termId]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subcategories</Text>
      
      {Array.isArray(subCategories) && subCategories.length > 0 ? (
        subCategories.map((item) => (
          <Text key={item.term_id} style={styles.subCategoryItem}>{item.name}</Text>
        ))
      ) : (
        <Text>No subcategories found.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 100,
  },
  subCategoryItem: {
    fontSize: 18,
    marginVertical: 5,
    textAlign: 'center',
  },
});

export default Subcategories;
