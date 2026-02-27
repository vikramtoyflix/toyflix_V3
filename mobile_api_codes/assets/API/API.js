import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const API = ({
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
  
//   const categoryID = 72;
useEffect(() => {
  const fetchProducts = async () => {
    try {
      setLoading(true);
  
      // Retrieve token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      // if (!token) {
      //   throw new Error('Token not found');
      // }
  
      // Log the token for debugging purposes
   
  
      // Make the API request with the token as a query parameter
      const response = await axios.get(
        `https://toyflix.in/wp-json/api/v1/featured-products`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          params: {
            token: token, // Pass token as a query parameter
          },
        }
      );
  
      console.log('Response Data:', response.data);
  
      if (Array.isArray(response.data)) {
        setProducts(response.data); // Set all products directly
      } else {
        console.warn('Unexpected response format:', response.data);
      }
    } catch (err) {
      if (err.response) {
        console.log('API Response Error:', err.response);
        if (err.response.status === 403) {
          console.error('403 Forbidden: Check token validity and API permissions.');
        }
      } else {
        console.error('Error fetching products:', err);
      }
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
           
              {/* // newlyadded */}
            {showImage && item.image && (
              <Image source={{ uri: item.image }} style={[styles.image]} />
            )}
           
            {showName && <Text style={[styles.title]}>{removeHTMLTags(item.name)}</Text>}

            {showPrice && (
              <Text style={[styles.originalPrice]}>MRP ₹{item.regular_price}</Text>
            )}
            
            {/* {showPrice && (
              <View style={{flexDirection:'row',justifyContent:"space-evenly",textAlign:"center",top:height*-0.029}}> */}
                <Text style={styles.discountedText}>Free with Subscription</Text>
                {/* <Image source={require('../src/Diamond.png')} style={styles.diamond}/>
              </View>
            )} */}
           
            
            <TouchableOpacity style={[styles.button]} onPress={() => navigation.navigate('ProductPage', {item})}>
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
    minHeight:280,
    // height:"auto",
    // height: height * 0.29, //0.28
    width: width * 0.39,  
    marginBottom: 16, 
    backgroundColor: 'white',
    borderRadius: 8,
    position:'relative',
    flexDirection:'column',
    justifyContent:'space-between',
    marginRight:10,
  },
  image: {
    top: height * 0.01,
    height:150,
    width: 130,
    marginBottom: 16,
    alignSelf: 'center',
  },
  title: {
    fontSize: 16, 
    // 10
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
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Urbanist-Regular',
    color: 'black',
    top: height * 0.007,
  },
  discountedText: {
    top: height * 0, // This can push it too high or out of view
    fontSize: 10,
    color: 'red',
    fontFamily: 'Urbanist-Regular',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  
  originalPrice: {
    fontSize: 12,
    textAlign: 'center',
    color: 'green',
    top: height * -0.001,
    textDecorationLine: 'line-through',  // Add this line for strikethrough effect
  },
  button: {
    backgroundColor: '#F22F47',
    height: height * 0.04,
    width: width * 0.35,
    // top:'auto',
    // bottom:'auto',
    top: height * 0.01, //0.25
    borderColor: 'white',
    borderWidth: 2,
    alignSelf: 'center',
    marginBottom:15,
    justifyContent:'center'
    
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: 16,
    alignSelf: 'center',
    top: height * 0.003,
    
  },
  diamond: {
    height: 18,
    width: 18,
    top: height * 0.027,
  }
});

export default API;