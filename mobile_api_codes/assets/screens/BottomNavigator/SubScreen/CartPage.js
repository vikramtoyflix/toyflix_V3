import { View, Text, FlatList, Image, StyleSheet, Dimensions, BackHandler, TouchableOpacity,Modal } from 'react-native';
import { useCart } from '../components/cart';
import React, { useCallback, useState, useEffect } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const he = require('he');

const removeHTMLTags = (text) => {
  // Check if the input is a string before using replace
  if (typeof text !== 'string') {
    return ''; // Return an empty string or handle it in some other way if needed
  }

  // Decode HTML entities using 'he'
  const decodedText = he.decode(text);

  // Remove HTML tags and extra spaces
  return decodedText
    .replace(/<\/?[^>]+(>|$)/g, "")  // Remove HTML tags
    .replace(/\s+/g, " ")            // Replace multiple spaces with a single space
    .trim();                         // Remove leading and trailing spaces
};

const CartPage = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [responseStatus, setResponseStatus] = useState(null); 
  const [showOverlay, setShowOverlay] = useState(true); 

  const [token1, setToken1] = useState(false);
  
  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken1(storedToken); // Ensure `setToken1` updates state
    };
    getToken();
  }, []);
  // const closeOverlay = () => setShowOverlay(false);
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Home1');
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [navigation])
  );
  const closeOverlay = async () => {
    setShowOverlay(false);
    try {
      await AsyncStorage.setItem('overlayShown', 'true'); // Save the flag to AsyncStorage
    } catch (error) {
      console.log('Error saving overlay state:', error);
    }
  };
  useEffect(() => {
    const checkOverlayStatus = async () => {
      try {
        const overlayShown = await AsyncStorage.getItem('overlayShown');
        if (overlayShown !== 'true') {
          // If the overlay hasn't been shown before, show it
          setShowOverlay(true);
        } else {
          // If the overlay has been shown before, don't show it again
          setShowOverlay(false);
        }
      } catch (error) {
        console.log('Error checking overlay status:', error);
      }
    };
  
    checkOverlayStatus();
  }, []); // Empty dependency array ensures this runs only once on mount
  
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
          console.log(response.data.products);
          console.log(response.data.product_id);
          setProducts(response.data.products);
        } else {
          setError('Failed to retrieve products');
        }
      } catch (err) {
        setError(err.message);
        setResponseStatus(404); // Set status to 404 on error
      } finally {
        setLoading(false);
      }
    };

    fetchCartProducts();
  }, []);

  const deleteItemFromCart = async (productId) => {
    if (!productId) {
      console.error("Product ID is undefined");
      return;
    }
  
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Token not found');
      }
  
      const body = {
        token: token,
        product_id: productId,
      };
  
      const response = await axios.post('https://toyflix.in/wp-json/api/v1/removed-to-cart/', body, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
  
      if (response.data.status === 'success') {
        setProducts((prevProducts) => prevProducts.filter((product) => product.product_id !== productId));
      } else {
        setError('Failed to delete product');
      }
    } catch (err) {
      console.log('Error deleting product:', err.response ? err.response.data : err.message);
      setError(err.response ? err.response.data : err.message);
    }
  };
  
  const deleteAllItemsFromCart = async () => {
    setIsDeleting(true); // Show loading state
    try {
      for (const product of products) {
        await deleteItemFromCart(product.product_id);
      }
      setProducts([]); // Immediately update the products array to reflect an empty cart
    } catch (error) {
      console.error('Error deleting all products:', error);
    } finally {
      setIsDeleting(false); // Reset loading state
    }
  };
  
  
  
  
  const renderItem = ({ item }) => {
    return (
      <View style={{ padding: 10, top: height * -0.02 }}>
        <View style={styles.productContainer}>
          <View style={{ flexDirection: 'row', padding: 10 }}>
            <Image style={styles.image} source={{ uri: item.image }} />
            <View style={styles.productInfo}>
              <Text style={styles.name}>{removeHTMLTags(item.product_name)}</Text>
              <Text style={styles.quantity}>Quantity: {item.quantity}</Text>
              {/* <Text style={styles.quantity}>id: {item.product_id}</Text> */}
              {/* <TouchableOpacity
  onPress={() => deleteItemFromCart(item.product_id)} // Ensure item.id is correctly passed
  style={styles.deleteButton}
>
  <Text style={styles.deleteButtonText}>Delete</Text>
</TouchableOpacity> */}

            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Overlay Modal */}
      {/* {showOverlay && (
        <Modal transparent={true} animationType="fade" visible={showOverlay}>
          <View style={styles.overlayContainer}>
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>
                The buttons will be activated 24 days after your box delivery.
              </Text>
              <TouchableOpacity onPress={closeOverlay} style={styles.overlayCloseButton}>
                <Text style={styles.overlayCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )} */}

      <View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: 20, top: height * 0.05, left: 15, zIndex: 10 }}
        >
          <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
        </TouchableOpacity>
        <Text style={styles.head}>Your Cart</Text>
      </View>
      
      {token1 ? (
  <>
    <FlatList
      showsVerticalScrollIndicator={false}
      data={products}
      keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
      renderItem={renderItem}
    />
    
    <View style={styles.totalPriceContainer}>
      {/* Total price can be calculated here */}
    </View>

    {/* Condition to hide the Rent Now button */}
    <TouchableOpacity
      style={styles.deleteAllButton}
      onPress={deleteAllItemsFromCart}
      disabled={isDeleting || products.length === 0}
    >
      <Text style={styles.deleteAllButtonText}>
        {isDeleting ? 'Deleting...' : 'Delete All'}
      </Text>
    </TouchableOpacity>
  </>
) : (
  <View style={styles.registerMessageContainer}>
    <Text style={styles.registerMessageText}>Please register to access this feature</Text>
  </View>
)}


      {products.length > 0 && responseStatus !== 404 && (
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => navigation.navigate('Delivery')}
        >
          <Text style={styles.purchaseButtonText}>Rent now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    height: height * 0.15,
    width: width * 0.23,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'white',
    top: height * 0.01,
    resizeMode: 'cover',
  },
  productInfo: {
    paddingLeft: width * 0.04,
    flex: 1,
    justifyContent: 'center',
  },
  productContainer: {
    backgroundColor: 'white',
    marginBottom: 5,
    top: height * 0.03,
    borderColor: 'black',
    borderWidth: 2,
    borderRadius: 20,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3D7DCF',
    marginBottom: 5,
    top: height * -0.02,
  },
  quantity: {
    fontSize: 14,
    color: '#666',
    top: height * 0.01,
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: '#FF6F61',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 5,
    // paddingVertical: 2, // Reduced padding
    // paddingHorizontal: 5, // Reduced padding
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  totalPriceContainer: {
    padding: 20,
    backgroundColor: '#D0E5FF',
    borderTopWidth: 5,
    borderColor: 'white',
  },
  purchaseButton: {
    padding: 15,
    backgroundColor: '#3D7DCF',
    borderRadius: 5,
    alignItems: 'center',
    margin: 20,
    top: height * -0.02,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  Arrow: {
    height: 20,
    width: 30,
    top: height * 0.01,
    left: height * -0.01,
    zIndex: 10,
  },
  head: {
    fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: width * 0.07,
    color: '#0D2D54',
    textAlign: 'center',
    top: height * 0,
    padding: 10,
  },
  deleteAllButton: {
    padding: 15,
    backgroundColor: '#FF6F61',
    borderRadius: 5,
    alignItems: 'center',
    // margin: 20,
    top: height * -0.02,
    width:"90%",
    left:width*0.05
  },
  registerMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerMessageText: {
    fontFamily: 'Little Comet Demo Version',
    fontSize: 18,
    color: 'black',
    fontWeight: 'bold',
  },
  deleteAllButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  overlayCloseButton: {
    backgroundColor: '#F22F47',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  overlayCloseText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default CartPage;
