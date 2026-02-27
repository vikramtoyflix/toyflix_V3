import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  Image,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable
} from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import Swiper from 'react-native-swiper';
// import WebPFormat from 'react-native-webp-format';



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
const { width, height } = Dimensions.get('window');

const subCategories = [
  { term_id: 73, name: '6m-2 years' },
  { term_id: 71, name: '2-3 years' },
  { term_id: 74, name: '3-4 years' },
  { term_id: 77, name: '4-6 years' },
  { term_id: 75, name: '6-8 years' },
];

const AddToys = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [products, setProducts] = useState([]);
  const [categoryID] = useState(73); // Default category ID (6m-2 years)
  const [selectedSubCategory, setSelectedSubCategory] = useState(73); // Default to "6m-2 years"
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch products when the component loads or when selectedSubCategory changes
  useEffect(() => {
    fetchProducts(); // Initial fetch based on the default subcategory
  }, [selectedSubCategory]);

  // Function to fetch products from API
  const convertWebpToJpg = async (imageUrl) => {
    if (!imageUrl || (!imageUrl.endsWith('.webp') && !imageUrl.includes('.webp'))) {
      return imageUrl; // Return original if not .webp
    }
  
    try {
      const jpgImage = await WebPFormat.getJpgUri(imageUrl);
      return jpgImage || imageUrl; 
    } catch (error) {
      console.error('Error converting WebP:', error);
      return imageUrl; 
    }
  };
  
  
  const fetchProducts = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
  
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `https://toyflix.in/wp-json/api/v1/get-all-product-by-category?categories=${selectedSubCategory || categoryID}&page=${page}`,
        { token: token },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );
  
      const data = response.data;
  
      if (data && data.status === 200 && Array.isArray(data.data)) {
        // Convert .webp images before updating state
        const newProducts = await Promise.all(
          data.data.map(async (product) => ({
            ...product,
            image: await convertWebpToJpg(product.image),
          }))
        );
  
        setProducts((prevProducts) => [...prevProducts, ...newProducts]);
        setPage((prevPage) => prevPage + 1);
        setHasMore(data.data.length > 0);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };
  
  
  
  
  

  // Handle subcategory selection
  const handleSubCategoryPress = (subCategoryId) => {
    setSelectedSubCategory(subCategoryId);
    setProducts([]); // Clear previous products
    setPage(1); // Reset to first page
    fetchProducts(); // Fetch products for the selected subcategory
  };

  // Load more products when the user scrolls to the bottom
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      fetchProducts(true); // Load more products
    }
  };

  // Open product modal
  const openModal = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  // Close product modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedProduct(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar backgroundColor="#0D2D54" barStyle="light-content" />
      <ImageBackground
        style={{ flex: 1 }}
        source={require('../../src/newbg.png')} // Background image
        resizeMode="cover"
      >
        <View style={styles.topbar}>
          <Text style={styles.topheading}>Add Toys</Text>
        </View>

        {/* Subcategory buttons */}
        <View style={styles.subCategoryContainer}>
          {subCategories.map((subCategory) => (
            <TouchableOpacity
              key={subCategory.term_id}
              style={[
                styles.subCategoryButton,
                selectedSubCategory === subCategory.term_id && styles.selectedSubCategory,
              ]}
              onPress={() => handleSubCategoryPress(subCategory.term_id)}
            >
              <Text style={styles.subCategoryText}>{subCategory.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Show loading indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F22F47" />
          </View>
        )}

        {/* Scrollable container for products */}
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={handleLoadMore}
        >
       {products.map((product) => (
  <TouchableOpacity onPress={() => openModal(product)} key={product.id}>
    <View style={styles.productContainer}>
      <Image
        source={{ uri: product.image }} // Converted .webp to .jpg if needed
        style={styles.image}
      />
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.originalPrice}>MRP ₹{product.regular_price}</Text>
      <Text style={styles.discountedText}>Free with Subscription</Text>
      <TouchableOpacity
        style={[styles.button]}
        onPress={() => navigation.navigate('ProductPage', { item: product })}
      >
        <Text style={styles.buttonText}>Subscribe Now</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
))}

        </ScrollView>

        {/* Product Modal */}
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
                  {/* Product Gallery */}
                  {selectedProduct.product_gallery && selectedProduct.product_gallery.length > 0 ? (
                    <Swiper
                      style={styles.swiper}
                      showsButtons={true}
                      nextButton={<Text style={styles.buttonText}>&gt;</Text>}
                      prevButton={<Text style={styles.buttonText}>&lt;</Text>}
                      paginationStyle={{ bottom: 10 }}
                      dotStyle={styles.dot}
                      activeDotStyle={styles.activeDot}
                    >
                      {selectedProduct.product_gallery.map((imageUrl, index) => (
                        <View key={index} style={styles.slide}>
                          <Image source={{ uri: imageUrl }} style={styles.sliderImage} />
                        </View>
                      ))}
                    </Swiper>
                  ) : (
                    <Image source={{ uri: selectedProduct.image }} style={styles.image} />
                  )}
                  {/* Product Name and Description */}
                  <Text style={styles.modalTitle}>{removeHTMLTags(selectedProduct.name)}</Text>
                  <Text style={styles.modalDescription}>{removeHTMLTags(selectedProduct.description)}</Text>
                </>
              )}
            </ScrollView>
            <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </ImageBackground>
    </View>
  );
};


export default AddToys;

const styles = StyleSheet.create({
  topbar: {
    height: height * 0.12,
    backgroundColor: 'white',
    justifyContent: 'center',
    // borderBottomWidth: 2,
    // borderBottomColor: '#F3C853', // Accent color
  },
  topheading: {
    fontFamily: 'Little Comet Demo Version',
    fontWeight: 'bold',
    fontSize: width * 0.08,
    color: 'black',
    textAlign: 'center',
    top: height * 0.028,
  },
  subCategoryContainer: {
    paddingBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginHorizontal: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingBottom: 100,
  },
  productContainer: {
    minHeight: 280,
    width: width * 0.42,  
    marginBottom: 16, 
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginRight: 10,
  },
  image: {
    height: 150,
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    fontSize: 14, 
    fontWeight: 'bold',
    marginRight: 5,
    textAlign: 'center',
    color: '#3D7DCF',
    fontFamily: 'Urbanist-Regular',
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'green',
  },
  button: {
    backgroundColor: '#F22F47',
    height: height * 0.05,
    width: '80%',
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  
  buttonText: {
    color: '#fff',
    fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  subCategoryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#e7e7e7',
    marginHorizontal: 8,
    marginVertical: 6, // Add vertical margin for spacing
    width: width * 0.40, // Adjust width for better appearance
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedSubCategory: {
    backgroundColor: '#F3C853',
  },
  subCategoryText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#0D2D54',
  },
  container: {
    flex: 1,
    left: width * 0.04,
  },
  productContainer: {
    minHeight:340,
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
    top: height * 0.04,
    fontSize: 10,
    color: '#3D7DCF',
    fontFamily: 'Urbanist-Regular',
    textDecorationLine: 'underline',
    textAlign: 'center',
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
  },
  subCategoryButton: {
    paddingVertical: 8, // Reduced vertical padding
    paddingHorizontal: 16, // Reduced horizontal padding
    borderRadius: 8, // Adjusted border radius for a smaller button
    backgroundColor: '#e7e7e7',
    marginHorizontal: 8,
    marginVertical: 4, // Reduced vertical margin for tighter spacing
    width: width * 0.35, // Adjusted width for better appearance
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedSubCategory: {
    backgroundColor: '#F3C853',
  },
  subCategoryText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#0D2D54',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: 10,
  },
  loadingContainer2: {
    alignItems: 'center',
    justifyContent: 'center',
    // flex: 1,
     marginTop: -50,
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
    // top: height * -0.07,
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
});



