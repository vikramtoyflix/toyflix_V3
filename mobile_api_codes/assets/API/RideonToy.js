import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, Dimensions, Alert, Modal, Pressable, } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const removeHTMLTags = (text) => {
  return text.replace(/<\/?[^>]+(>|$)/g, "");
};

const RideonToy = ({
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
  const categoryID = 80;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        // if (!token) {
        //   throw new Error('Token not found');
        // }

        const response = await axios.post(
          `https://toyflix.in/wp-json/api/v1/product-by-category?categories=${categoryID}`,
          { token: token },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
          }
        );

        if (response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
          const initialProducts = response.data.data.map(product => ({
            ...product,
            reserved_product: false // Ensure reserved_product is initialized
          })).slice(0, 10);
          setProducts(response.data.data);
        } else {
          throw new Error('Unexpected response format');
          
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

const handleReserve = (productId) => {
  console.log(`Toggling reservation for product ${productId}`);
  setProducts((prevProducts) =>
    prevProducts.map((product) => {
      if (product.id === productId) {
        const newReservedState = !product.reserved_product;
        console.log(`Product ${productId} reserved state changed to: ${newReservedState}`);
        return { ...product, reserved_product: newReservedState };
      }
      return product;
    })
  );
};


  const reserveProduct = async (productId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      // if (!token) {
      //   throw new Error('Token not found');
      // }
  
      const response = await axios.post(
        `https://toyflix.in/wp-json/api/v1/save-reserved-product`,
        {
          token: token,
          product_ids: productId.toString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
  
      if (response.status === 200) {
        // Call handleReserve instead of setting state directly
        handleReserve(productId);
        Alert.alert(
          'Product Reserved',
          'You will receive a notification when this product becomes available.',
          [{ text: 'OK' }] // Button to dismiss the alert
        );
        console.log(`Product ${productId} reserved successfully.`);
      } else {
        console.warn('Failed to reserve product');
      }
    } catch (error) {
      console.error('Error reserving product:', error);
    }
  };
  
  

  if (loading) {
    return <Text style={{ color: "white", textAlign: 'center' }}>Loading...</Text>;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
  // data={products.filter(item => item.stock_status !== false)} // Filter out out-of-stock items
  data={products} // Show all products, including out-of-stock ones

  keyExtractor={(item) => item.id.toString()}
  renderItem={({ item }) => {
    const isReserved = item.reserved_product === true;
    const isOutOfStock = item.stock_status === false;

    return (
      <View style={styles.productContainer}>
        {showImage && item.image && (
          <Image source={{ uri: item.image }} style={[styles.image]} />
        )}

        {showName && <Text style={[styles.title]}>{removeHTMLTags(item.name)}</Text>}
        <Text style={[
  styles.originalPrice, 
  { textDecorationLine: item.categories && item.categories.includes("Ride on Toys") 
      ? (item.regular_price.includes("1999") ? "none" : "line-through") 
      : "line-through" 
  }
]}>
  MRP ₹{item.price === 0 ? 1999 : item.regular_price}/month
</Text>

          <TouchableOpacity style={[styles.button]} onPress={() => navigation.navigate('ProductPage', { item })}>
            {showButton && <Text style={styles.buttonText}>Rent Now</Text>}
          </TouchableOpacity>
     
      </View>
    );
  }}
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
    minHeight: 340,
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
  outOfStockContainer: {
    backgroundColor: '#D3D3D3', // Grey background for out-of-stock items
  },
  outOfStockText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    top: height * -0.01,
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    color: 'green',
    paddingBottom:10
  },
  reserveButton: {
    backgroundColor: '#174C8F',
    padding: 5,
    borderRadius: 5,
    marginTop: 3,
  },
  reserveButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
});

export default RideonToy;
