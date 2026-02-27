import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Dimensions, Modal, Pressable, ScrollView } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Swiper from 'react-native-swiper';
const { width, height } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';
const ExploreApi = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);
  const navigation = useNavigation();
  const fetchProducts = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(`https://toyflix.in/wp-json/api/v1/product-by-category?categories=80`,
        { token: token },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      const data = response.data;
      console.log(data);

      if (data && data.status === 200 && Array.isArray(data.data)) {
        const newProducts = data.data.slice(5 * (page - 1), 5 * page);
        setProducts(prevProducts => [...prevProducts, ...newProducts]);
        setPage(prevPage => prevPage + 1);
        setHasMore(data.data.length > 5 * page);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err);
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };
  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

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

  if (loading && products.length === 0) {
    return <ActivityIndicator size="large" color="white" style={{ top: 50 }} />;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={products}
        contentContainerStyle={styles.grid}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isOutOfStock = item.stock_status === false;
          const isReserved = item.reserved_product === true;
          return (
            <TouchableOpacity onPress={() => handleProductPress(item)}>
              <View style={styles.productContainer}>
                {item.image && (
                  <Image source={{ uri: item.image }} style={styles.image} />
                )}
                <Text style={styles.title}>{item.name}</Text>
                <Text style={[styles.originalPrice]}>
                  MRP ₹{item.price === 0 ? 1999 : item.regular_price}/month
                </Text>
              

           
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('ProductPage', { item })}
                  >
                    <Text style={styles.buttonText}>Rent Now</Text>
                  </TouchableOpacity>
   
              </View>
            </TouchableOpacity>
          );
        }}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore && !loadingMore) {
            fetchProducts(true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore && <ActivityIndicator size="large" color="#0000ff" />}
      />

      {/* Modal for product details */}
      <Modal
  animationType="slide"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {selectedProduct && (
          <>
            
            {console.log("Selected Product:", selectedProduct)}

       
            {/* <Image source={{ uri: selectedProduct.image }} style={styles.modalImage} /> */}

   
            {selectedProduct.gallery_image_urls && selectedProduct.gallery_image_urls.length > 0 ? (
              <>
                {console.log("Product Gallery:", selectedProduct.gallery_image_urls)}

                <Swiper
  style={styles.swiper}
  showsButtons={true}
  nextButton={<Text style={styles.buttonText}>&gt;</Text>} // Correct use of nextButton
  prevButton={<Text style={styles.buttonText}>&lt;</Text>} // Correct use of prevButton
  paginationStyle={{ bottom: 10 }} // Adjust pagination position
  dotStyle={styles.dot} // Style for inactive dots
  activeDotStyle={styles.activeDot} // Style for active dot
>
  {selectedProduct.gallery_image_urls.map((imageUrl, index) => (
    <View key={index} style={styles.slide}>
      <Image source={{ uri: imageUrl }} style={styles.sliderImage} />
    </View>
  ))}
</Swiper>


              </>
            ) : (
              <>
                {console.log("No gallery images found")}
                <Text>No gallery images available.</Text>
              </>
            )}

            {/* Product Name and Description */}
            <Text style={styles.modalTitle}>{removeHTMLTags(selectedProduct.name)}</Text>
            <Text style={styles.modalDescription}>{removeHTMLTags(selectedProduct.description)}</Text>
          </>
        )}
      </ScrollView>

      {/* <Pressable style={styles.arrowButton} onPress={handlePermalink}>
        <Text style={styles.arrowText}>➔</Text>
      </Pressable> */}

      <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
        <Text style={styles.closeButtonText}>Close</Text>
      </Pressable>
    </View>
  </View>
</Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingBottom: 100,
  },
  productContainer: {
    minHeight: 310,
    width: width * 0.42,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 18,
    position: 'relative',
    flexDirection: 'column',
    justifyContent: 'space-between',
    top: height * 0.03,
  },
  image: {
    top: height * 0.01,
    height: height * 0.15,
    width: width * 0.35,
    marginBottom: 16,
    alignSelf: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
    textAlign: 'center',
    color: '#3D7DCF',
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 1,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    color: 'green',
  },
  button: {
    backgroundColor: '#F22F47',
    borderRadius: 5,
    height: height * 0.04,
    width: width * 0.35,
    borderColor: 'white',
    borderWidth: 2,
    alignSelf: 'center',
    marginBottom: 15,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    alignSelf: 'center',
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
  modalContainer: {
    top:height*0.2,
    height:height*0.6,
    width:width*1,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor:'black',
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContainer: {
    top:height*0.2,
    height:height*0.6,
    width:width*1,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor:'black',
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    textAlign:'center'
  },
  modalImage: {
    width: width * 0.6,
    height: height * 0.3,
    borderRadius: 10,
     alignSelf:'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
    alignSelf:'center',
    color: 'black',
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
     textAlign:'center',
     color: 'black',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#174C8F',
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  viewIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 15,
  },
  viewIconImage: {
    width: 20,
    height: 20,
  },
  arrowButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  swiper: {
    height: 300, // Adjust height for the swiper
    borderRadius: 10,
    overflow: 'hidden',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'contain', // Adjust as needed
  },
  button: {
    backgroundColor: 'green',
    height: height * 0.04,
    width: width * 0.35,
    // top:'auto',
    // bottom:'auto',
    top: height * 0, //0.25
    borderColor: 'white',
    borderWidth: 2,
    alignSelf: 'center',
    marginBottom:15,
    justifyContent:'center',
    borderRadius:10
    
  },
  buttonText: {
    color: '#fff',
    // fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: 16,
    alignSelf: 'center',
    // top: height * 0.003,
    
  },
});

export default ExploreApi;
