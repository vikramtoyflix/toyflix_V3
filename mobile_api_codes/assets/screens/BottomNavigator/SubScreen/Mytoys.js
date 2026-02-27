import { StyleSheet, Text, View, ImageBackground, StatusBar, Dimensions, FlatList, Image,TouchableOpacity} from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Import axios
import { useNavigation } from '@react-navigation/native';
import FloatingButtons from '../../components/FloatingButtons';
const { width, height } = Dimensions.get('window');

const Mytoys = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const he = require('he');
  const navigation = useNavigation();

  const removeHTMLTagsAndFormatPrice = (htmlString) => {
    let priceString = htmlString.replace(/<[^>]+>/g, ''); // Remove HTML tags
    priceString = priceString.replace(/&#8377;/g, ''); // Remove Indian Rupee symbol
    return parseFloat(priceString.trim().replace(/,|\.\d+/g, '')); // Convert to float
  };

  const removeHTMLTags = (text) => {
    if (typeof text !== 'string') {
      return ''; // Return an empty string or handle it in some other way if needed
    }

    const decodedText = he.decode(text);
    return decodedText
      .replace(/<\/?[^>]+(>|$)/g, "")  // Remove HTML tags
      .replace(/\s+/g, " ")            // Replace multiple spaces with a single space
      .trim();                         // Remove leading and trailing spaces
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Token not found');
      }

      console.log('Fetching orders with token:', token);

      // Use axios to make the request
      const response = await axios.get(`https://toyflix.in/wp-json/api/v1/get-order/?token=${token}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      });

      console.log('Response data:', response.data);

      if (response.data.code === 'success' && response.data.data && response.data.data.orders) {
        setOrders(response.data.data.orders); // Set orders if the response is valid
      } else {
        throw new Error(response.data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      setError(error.message); // Set the error message
    } finally {
      setLoading(false);
    }
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <Text style={styles.orderId}>Order ID: {item.order_id}</Text>
      <Text style={styles.orderStatus}>Status: {item.status}</Text>
      <Text style={styles.orderTotal}>Total: ₹{item.total}</Text>
      <Text style={styles.orderDate}>Order Date: {item.order_date}</Text>

      {/* Render items within the order */}
      <FlatList
        data={item.items}
        keyExtractor={(item, index) => index.toString()} // Assuming items don't have unique IDs
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Image 
              source={item.product_image ? { uri: item.product_image } : null} 
              style={styles.productImage} 
            />
            <Text style={styles.productName}>{removeHTMLTags(item.product_name) || "Product Name"}</Text>
          </View>
        )}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={{ backgroundColor: '#FFFFFF' }} barStyle="dark-content" />
      <ImageBackground style={{ flex: 1 }} source={require('../../../src/newbg.png')} resizeMode="cover">
      <View style={styles.topbar} >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{zIndex: 10,}}>
          <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
        </TouchableOpacity>
        <Text animation="zoomIn" duration={3000} style={styles.topheading}>My Orders</Text>
        </View>
        <View style={styles.content}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : error ? (
            <Text style={styles.errorText}> {error}</Text>
          ) : orders.length > 0 ? (
            <FlatList
              data={orders}
              keyExtractor={(item) => item.order_id.toString()}
              renderItem={renderOrderItem}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <Text style={styles.noOrdersText}>No orders found</Text>
          )}
        </View>
        <FloatingButtons/>
      </ImageBackground>
    </View>
  );
};

export default Mytoys;
const styles = StyleSheet.create({
  topbar: {
    height: height * 0.12,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  topheading: {
    fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: width * 0.07,
    color: '#0D2D54',
    textAlign: 'center',
    top: height * 0.019,
    left: height * 0.01,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  noOrdersText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D2D54',
    marginBottom: 5,
  },
  orderStatus: {
    fontSize: 14,
    color: '#FFA500',
    marginBottom: 5,
  },
  orderTotal: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  productName: {
    fontSize: 14,
    color: '#333',
    paddingRight: 10,
    flexWrap: 'wrap', // Allows text to wrap
    maxWidth: '80%', // Set to a percentage or fixed value to control width
  },
  Arrow: {
    height: 20,
    width: 30,
    top:height*0.043,
    left:width*0.05,
    zIndex:9
},
});
