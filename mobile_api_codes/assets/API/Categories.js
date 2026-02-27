import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar, ActivityIndicator,Linking, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, ImageBackground,Modal,Pressable,ScrollView, Alert} from 'react-native';
import axios from 'axios';
import { useCart } from '../screens/BottomNavigator/components/cart';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMember } from './MemberContext';
import Swiper from 'react-native-swiper';
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
const Categories = ({ route, navigation }) => {
  const { termId } = route.params; // Get the termId from route params
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null); // State for selected subcategory
  const [products, setProducts] = useState([]); // State for products
  const [loadingProducts, setLoadingProducts] = useState(false); // State for loading products
  const [productError, setProductError] = useState(null); // State for product error
  const [selectedProducts, setSelectedProducts] = useState({}); // Track selected products per category
  const { addItemToCart } = useCart();
  const [modalVisible, setModalVisible] = useState(false); // State to control modal visibility
  const [selectedProduct, setSelectedProduct] = useState(null); // State for selected product details
  const [reservedProducts, setReservedProducts] = useState({});
  const [orders, setOrders] = useState([]);
  const up = route.params?.up; // Get memberId if available

  console.log("helwwwwwww",up);
  // const { memberId } = useMember();
  const { memberId } = route.params || {}; 
  console.log("memberId",memberId);
  console.log("termId",termId);
  // const [reservedProducts, setReservedProducts] = useState({});
  const [reservedProductIds, setReservedProductIds] = useState([]);
  const handlePermalink = () => {
    if (selectedProduct && selectedProduct.permalink) {
      Linking.openURL(selectedProduct.permalink);
    }
  };
  // console.log('Member ID:', memberId);
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          throw new Error('Token not found');
        }
        // console.log('Token:', token);

        const response = await axios.get(
          `https://toyflix.in/wp-json/custom-api/v1/get-mapped-category-data/?term_id=${termId}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
            params: {
              token: token,  
            },
          }
        );

        // console.log(response.data);
        
        if (response.data && response.data.status === 200) {
          setSubCategories(response.data.data);
          if (response.data.data.length > 0) {
            setSelectedSubCategory(response.data.data[0].term_id); 
          }
        } else {
          setError('No subcategories found.');
        }
      } catch (err) {
        if (err.response) {
          // console.log('API Response Error:', err.response.data);
          setError('Failed to load subcategories.');
        } else {
          console.error('Error fetching subcategories:', err);
          setError(err.message || 'Failed to load subcategories.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSubCategories();
  }, [termId]);
  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedSubCategory) return;
  
      setLoadingProducts(true);   //termId
      setProductError(null);
  
      try {
        // Construct the API URL exactly as required  selectedSubCategory 
        const url = `https://toyflix.in/wp-json/api/v1/product-by-category?categories=${termId}&parent_id=${selectedSubCategory}&plan_id=${memberId}`;
  
        console.log('🔗 Sending URL:', url);  // Debug the exact URL being sent
  
        const response = await axios.post(url);

  
        // console.log('✅ API Response:', response.data);
  
        if (response.data && response.data.status === 200) {
          setProducts(response.data.data);
        } else {
          setProductError('No products found.');
        }
      } catch (err) {
        if (err.response) {
          console.log('❌ API Response Error:', err.response.data);
          setProductError('Failed to load products: ' + err.response.data.message);
        } else {
          console.error('❌ Error fetching products:', err);
          setProductError('Failed to load products.');
        }
      } finally {
        setLoadingProducts(false);
      }
    };
  
    fetchProducts();
  }, [selectedSubCategory]);
  
  
  
  
  
  


  const handleSelectProduct = (productId, product) => {

    setSelectedProducts((prev) => ({
      ...prev,
      [selectedSubCategory]: product, 
    }));
    

    const currentIndex = subCategories.findIndex((sub) => sub.term_id === selectedSubCategory);
    if (currentIndex < subCategories.length - 1) {
      const nextSubCategoryId = subCategories[currentIndex + 1].term_id;
      setSelectedSubCategory(nextSubCategoryId);
    }
  };
  const handleLongPressProduct = (product) => {
    setSelectedProduct(product); 
    setModalVisible(true);
  };

  const allCategoriesSelected = () => {
    return Object.keys(selectedProducts).length === subCategories.length;
  };
  const handleReserve = (productId) => {
    Alert.alert(
      "Product Reserved", 
      "We will notify you when this product is available.",
      [{ text: "OK", onPress: () => console.log("OK Pressed") }],
      { cancelable: true }
    );
  
    // Mark this specific product as reserved
    setReservedProducts((prevReserved) => ({
      ...prevReserved,
      [productId]: true, // Mark the product as reserved
    }));
  };
//   const handleContinue = async () => {
//     const { processingOrders, completeOrders } = await fetchOrders(); // Fetch both processing and completed orders
//     const currentDate = new Date();

//     console.log('Current date:', currentDate);
//     console.log('Number of processing orders:', processingOrders.length);
//     console.log('Number of completed orders:', completeOrders.length);
//     console.log('Items in most recent processing order:', recentOrder.items);

//     // If there are no processing orders and no completed orders, proceed to add products to cart
//     if (processingOrders.length === 0 && completeOrders.length === 0) {
//         console.log('No processing or completed orders found. Proceeding to add products to cart.');

//         if (!allCategoriesSelected()) {
//             Alert.alert('Please select at least one product from each category.');
//             return;
//         }

//         await addToCart();
//     } else {
//         // Prioritize the most recent processing order if available
//         let recentOrder = null;

//         if (processingOrders.length > 0) {
//             processingOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
//             recentOrder = processingOrders[0];
//             console.log('Using most recent processing order.');
//         } else if (completeOrders.length > 0) {
//             completeOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
//             recentOrder = completeOrders[0];
//             console.log('Using most recent completed order.');
//         }

//         // Only proceed if the recent order contains specific products
//         if (recentOrder && containsSpecificProducts(recentOrder.items)) {
//             const orderDateStr = recentOrder.order_date; 
//             const orderDate = new Date(orderDateStr.replace(/ /g, 'T')); // Adjust format if necessary
//             console.log('Most recent order date:', orderDate);

//             const daysLimit = 24; // The limit is 24 days
//             const twentyFourDaysInMs = daysLimit * 24 * 60 * 60 * 1000; // 24 days in milliseconds
//             const timeDifference = currentDate - orderDate;
//             const remainingDays = Math.ceil((twentyFourDaysInMs - timeDifference) / (24 * 60 * 60 * 1000)); // Remaining days

//             if (timeDifference < twentyFourDaysInMs) {
//                 Alert.alert(`You can add products to your cart in ${remainingDays} day(s) from your last order.`);
//                 return;
//             } else {
//                 await addToCart();
//             }
//         }
//     }
// };

// // Helper function to check if an order contains specific products
// const containsSpecificProducts = (items) => {
//   const targetProducts = ["6 Month Plan", "6 Month Plan PRO", "Trial Plan"];
//   return items.some(item => targetProducts.includes(item.details.product_name)); // Adjust path as needed
// };

const handleContinue = async () => {
  const { processingOrders, completeOrders } = await fetchOrders(); // Fetch both processing and completed orders
  const currentDate = new Date();

  // console.log('Current date:', currentDate);
  // console.log('Number of processing orders:', processingOrders.length);
  // console.log('Number of completed orders:', completeOrders.length);

  // If there are no processing orders and no completed orders, proceed to add products to cart
  if (processingOrders.length === 0 && completeOrders.length === 0) {
      // console.log('No processing or completed orders found. Proceeding to add products to cart.');

      if (!allCategoriesSelected()) {
          Alert.alert('Please select at least one product from each category.');
          return;
      }

      await addToCart();
  } else {
      // Prioritize the most recent processing order if available
      let recentOrder = null;

      if (processingOrders.length > 0) {
          processingOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
          recentOrder = processingOrders[0];
          // console.log('Using most recent processing order.');
      } else if (completeOrders.length > 0) {
          completeOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
          recentOrder = completeOrders[0];
          // console.log('Using most recent completed order.');
      }

      // Check if the recent order should apply the 24-day condition
      const containsTargetProduct = recentOrder && containsSpecificProducts(recentOrder.items);
      const hasFourItems = recentOrder && recentOrder.items.length === 4;

      // If either condition is true, apply the 24-day restriction
      if (containsTargetProduct || hasFourItems) {
          // console.log('Recent order meets conditions for 24-day restriction.');

          const orderDate = new Date(recentOrder.order_date.replace(/ /g, 'T'));
          const daysLimit = 24; // The limit is 24 days
          const twentyFourDaysInMs = daysLimit * 24 * 60 * 60 * 1000; // 24 days in milliseconds
          const timeDifference = currentDate - orderDate;
          const remainingDays = Math.ceil((twentyFourDaysInMs - timeDifference) / (24 * 60 * 60 * 1000)); // Remaining days

          if (timeDifference < twentyFourDaysInMs) {
              Alert.alert(`You can add products to your cart in ${remainingDays} day(s) from your last order.`);
              return;
          } else {
              await addToCart();
          }
      } else {
          // If no target product is found in the recent order and doesn't have 4 items, add to cart immediately
          // console.log('No target product found in recent orders or doesnt have 4 items. Proceeding to add products to cart.');
          await addToCart();
      }
  }
};

// Helper function to check if an order contains specific products
const containsSpecificProducts = (items) => {
  const targetProducts = ["6 Month Plan", "6 Month Plan PRO", "Trial Plan"];
  return items.some(item => targetProducts.includes(item.product_name)); // Adjust path as needed
};





const reserveProduct = async (productId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('Token not found');
    }

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
      // Update the reserved state of the specific product
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === productId ? { ...product, reserved_product: true } : product
        )
      );
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


const fetchOrders = async () => {
  try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
          throw new Error('Token not found');
      }

      console.log('Fetching orders with token:', token);

      const response = await axios.get(`https://toyflix.in/wp-json/api/v1/get-order/?token=${token}`, {
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
          },
      });

      console.log('Response data:', response.data);

      if (response.data.code === 'success' && response.data.data && response.data.data.orders) {
          console.log('Fetched orders:', response.data.data.orders);
          
   
          const completeOrders = response.data.data.orders.filter(order => 
              order.status === 'Completed' || 
              order.status === 'Delivery Completed' || 
              order.status === 'Pickup Completed'
          );
          const processingOrders = response.data.data.orders.filter(order => order.status === 'Processing');
          
          console.log('Filtered processing orders:', processingOrders); 
          console.log('Filtered completed orders:', completeOrders);

          return { processingOrders, completeOrders }; // Return both types of orders
      }
  } catch (error) {
      setError(error.message); 
  } finally {
      setLoading(false);
  }

  return { processingOrders: [], completeOrders: [] }; // Return empty arrays if an error occurs or no orders are found
};




const addToCart = async () => {
  if (!allCategoriesSelected()) {
    Alert.alert('Please select at least one product from each category.');
    return;
  }

  const token = await AsyncStorage.getItem('token');
  if (!token) {
    Alert.alert('Token not found. Please log in again.');
    return;
  }

  const selectedProductArray = Object.values(selectedProducts).map(product => ({
    product_id: product.id,
    quantity: product.quantity || 1,
  }));

  if (up === 1 && memberId) {
    selectedProductArray.push({
      product_id: memberId,
      quantity: 1
    });
  }

  try {
    const response = await axios.post('https://toyflix.in/wp-json/api/v1/add-to-cart/', { token, products: selectedProductArray }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (response.data.status === "success") {
      Alert.alert('Selected products added to cart!');
      navigation.navigate('CartPage', { selectedProducts: selectedProductArray });
    } else {
      const errors = response.data.errors || [];
      const errorMessage = errors.length > 0 ? errors.join('\n') : 'Failed to add products to cart. Please try again.';
      Alert.alert(errorMessage);
    }

  } catch (error) {
    console.error('Error adding products to cart:', error.response ? error.response.data : error.message);
    Alert.alert('Failed to add products to cart. Please try again.');
  }
};





  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  const renderSubCategory = ({ item }) => (
    
    <TouchableOpacity
      style={[styles.subCategoryButton, selectedSubCategory === item.term_id && styles.selectedSubCategory]}
      onPress={() => setSelectedSubCategory(item.term_id)}
    >
      <Text style={styles.subCategoryText}>{item.name}</Text>
    </TouchableOpacity>
  );

 const sortedProducts = products.slice().sort((a, b) => {
  const aOutOfStock = a.stock_status === false;
  const bOutOfStock = b.stock_status === false;
  
  return aOutOfStock === bOutOfStock ? 0 : aOutOfStock ? 1 : -1;
});

  

  const renderProduct = ({ item }) => {
    const isReserved = item.reserved_product === true;
    const isOutOfStock = item.stock_status === false;
  
    return (
      <TouchableOpacity
        style={[
          styles.productContainer,
          selectedProducts[selectedSubCategory]?.id === item.id && styles.selectedProduct,
          isOutOfStock && styles.outOfStockContainer,
        ]}
        onPress={() => handleLongPressProduct(item)}
        disabled={isOutOfStock}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: 'white' }]} />
        )}
  
        <Text style={styles.productTitle}>{removeHTMLTags(item.name)}</Text>
        {/* {isOutOfStock ? (
          <View>
            <TouchableOpacity
              style={styles.reserveButton}
              onPress={() => !isReserved && reserveProduct(item.id)}
              disabled={isReserved} 
            >
              <Text style={styles.reserveButtonText}>
                {isReserved ? 'Reserved' : 'Reserve'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (  }}*/}
          <Text style={styles.originalPrice}>MRP ₹{item.regular_price}</Text>
       
    {!isOutOfStock && (
    <TouchableOpacity
      style={styles.button}
      onPress={() => handleSelectProduct(item.id, item)}
    >
      <Text style={styles.buttonText}>Click to select</Text>
    </TouchableOpacity>
  )}
        {isOutOfStock && (
          <Text style={styles.outOfStockText}>Out of Stock</Text>
        )}
  
        {/* View icon in the top-right corner */}
        {/* <TouchableOpacity
          style={styles.viewIcon}
          onPress={() => handleLongPressProduct(item)}
        >
          <Image
            source={require('../screens/BottomNavigator/src/Paymentelements/view.png')}
            style={styles.viewIconImage}
          />
        </TouchableOpacity> */}
      </TouchableOpacity>
    );
  };
  
  

  return (
    <View style={{ flex: 1 }}>
      <StatusBar backgroundColor='#174C8F' barStyle='dark-content' />
      <ImageBackground
        style={{ flex: 1 }}
        source={require('../src/111.png')}
        resizeMode="cover"
      >
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ zIndex: 10 }}>
            <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
          </TouchableOpacity>
          <Text style={styles.topheading}>Choose Toys</Text>
        </View>
        <View style={styles.container}>
        {Array.isArray(subCategories) && subCategories.length > 0 ? (
  <View>
    {subCategories.length > 3 ? ( // Change this condition as needed
      <FlatList
        showsVerticalScrollIndicator={false}
        data={subCategories}
        keyExtractor={item => item.term_id.toString()}
        renderItem={renderSubCategory}
        numColumns={2} // Display 3 items per row
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subCategoryContainer}
      />
    ) : (
      <FlatList
        showsVerticalScrollIndicator={false}
        data={subCategories}
        keyExtractor={item => item.term_id.toString()}
        renderItem={renderSubCategory}
        numColumns={2} // Display 1 item per row
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subCategoryContainer}
      />
    )}
  </View>
) : (
  <Text>No subcategories found.</Text>
)}


          
          {selectedSubCategory && (
            <>
              {loadingProducts ? (
                <ActivityIndicator size="large" color="white" style={styles.loadingIndicator2} />
              ) : productError ? (
                <Text style={styles.errorText}>{productError}</Text>
              ) : (
                <FlatList
                  data={sortedProducts}
                  contentContainerStyle={styles.grid}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderProduct}
                  horizontal={false}
                  showsVerticalScrollIndicator={false}
                />
                
              )}
              
            </>
            
          )}
           {/* Modal for product details */}
          

          {allCategoriesSelected() && (
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}> 
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
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
            
            {/* {console.log("Selected Product:", selectedProduct)} */}

       
            {/* <Image source={{ uri: selectedProduct.image }} style={styles.modalImage} /> */}

   
            {selectedProduct.gallery_image_urls && selectedProduct.gallery_image_urls.length > 0 ? (
              <>
                {/* {console.log("Product Gallery:", selectedProduct.gallery_image_urls)} */}

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
                {/* {console.log("No gallery images found")} */}
                <Image source={{ uri: selectedProduct.image }} style={styles.image3} />
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




      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    // flex: 1,
    paddingBottom:100,
    top: height * 0,
  },
  topbar: {
    height: height * 0.12,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  sliderImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginRight: 10,
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
    top: height * -0.02,
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
  topheading: {
    fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: width * 0.07,
    color: '#0D2D54',
    textAlign: 'center',
    top: height * 0.02,
    left: height * 0.01,
  },
  image3: {
    height: 150,
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  Arrow: {
    height: 20,
    width: 30,
    top: height * 0.047,
    left: width * 0.04,
    zIndex: 9,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
     color:"#F22F47"
  },
  loadingIndicator2:{
    justifyContent: 'center',
    alignItems: 'center',
    color:"#F22F47"
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingBottom:250
  },
  productContainer: {
    minHeight: 320,
    top: height * 0.03,
    width: width * 0.42,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 18,
    position: 'relative',
    flexDirection: 'column',
    justifyContent: 'space-between',
    
  },
  selectedProduct: {
    backgroundColor: '#F3C853', // Change background color when selected
    borderColor: 'white',
    borderWidth: 2,
  },
  image: {
    top: height * 0.01,
    height: height * 0.15,
    width: width * 0.35,
    marginBottom: 16,
    alignSelf: 'center',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    top: height * 0,
    padding:2,
    color: 'black',
  },
  originalPrice: {
    fontSize: 12,
    textAlign: 'center',
    color: 'blak',
    top: height * -0.005,
    textDecorationLine: 'line-through',  // Add this line for strikethrough effect
  },
  
  subCategoryContainer: {
    rowGap:10,
    paddingBottom: 10,
    alignItems: 'center',
    
  },
  subCategoryButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e7e7e7',
    marginHorizontal: 8,
    // top:-300 //new
  },
  selectedSubCategory: {
    backgroundColor: '#F3C853',
  },
  subCategoryText: {
    fontWeight: 'bold',
    color: 'black',
  },
  continueButton: {
    marginTop: 20,
    backgroundColor: '#F22F47',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    position:'absolute',
    top: height * 0.7,
    width:'100%',
    left: width * 0.04,
    height:height*0.07,
    borderColor:'white',
    borderWidth:3,
    borderRadius:20,
    justifyContent:'center'
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Little Comet Demo Version',
    // fontFamily:'600'
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

export default Categories;
