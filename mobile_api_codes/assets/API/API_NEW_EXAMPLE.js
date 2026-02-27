// EXAMPLE: Migrated API.js using new configuration system
// This shows how to convert existing API calls to use the centralized config

import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../../utils/apiService'; // Import centralized API service
import { API_CONFIG } from '../../config/apiConfig'; // Import config for debugging

const { width, height } = Dimensions.get('window');
const he = require('he');

const removeHTMLTags = (text) => {
  if (typeof text !== 'string') {
    return '';
  }
  const decodedText = he.decode(text);
  return decodedText
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const API_NEW = ({
  showImage,
  showCategories,
  showName,
  showShortDescription,
  showDescription,
  showPermalink,
  showPrice,
  imageStyle,
  categoriesStyle,
  nameStyle,
  shortDescriptionStyle,
  descriptionStyle,
  permalinkStyle,
  priceStyle,
  showButton,
  buttonStyle,
  nav,
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Using the new centralized API service
        console.log('Fetching from:', API_CONFIG.PRODUCTS.FEATURED); // Debug log
        const response = await ApiService.products.getFeatured();
        
        console.log('Response Data:', response.data);

        if (Array.isArray(response.data)) {
          setProducts(response.data);
        } else {
          console.warn('Unexpected response format:', response.data);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading && products.length === 0) {
    return <Text style={{color:"white", textAlign:'center'}}>Loading...</Text>;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.productContainer}>
            {showImage && item.image && (
              <Image source={{ uri: item.image }} style={[styles.image]} />
            )}
           
            {showName && <Text style={[styles.title]}>{removeHTMLTags(item.name)}</Text>}

            {showPrice && (
              <Text style={[styles.originalPrice]}>MRP ₹{item.regular_price}</Text>
            )}
            
            <Text style={styles.discountedText}>Free with Subscription</Text>
           
            <TouchableOpacity 
              style={[styles.button]} 
              onPress={() => navigation.navigate('ProductPage', {item})}
            >
              {showButton && <Text style={styles.buttonText}>Subscribe Now</Text>}
            </TouchableOpacity>
          </View>
        )}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    left: width * 0.04,
  },
  productContainer: {
    minHeight: 280,
    width: width * 0.39,  
    marginBottom: 16, 
    backgroundColor: 'white',
    borderRadius: 8,
    position: 'relative',
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginRight: 10,
  },
  image: {
    top: height * 0.01,
    height: 150,
    width: 130,
    marginBottom: 16,
    alignSelf: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
    textAlign: 'center',
    color: 'black',
    left: width * 0.01,
    fontFamily: 'Urbanist-Regular',
    color: '#3D7DCF',
    fontWeight: 'bold'
  },
  originalPrice: {
    fontSize: 12,
    textAlign: 'center',
    color: 'green',
    top: height * -0.001,
    textDecorationLine: 'line-through',
  },
  discountedText: {
    top: height * 0,
    fontSize: 10,
    color: 'red',
    fontFamily: 'Urbanist-Regular',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#F22F47',
    height: height * 0.04,
    width: width * 0.35,
    top: height * 0.01,
    borderColor: 'white',
    borderWidth: 2,
    alignSelf: 'center',
    marginBottom: 15,
    justifyContent: 'center'
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: 16,
    alignSelf: 'center',
    top: height * 0.003,
  },
});

export default API_NEW;
