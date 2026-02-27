import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, ImageBackground, StatusBar, ScrollView, BackHandler,FlatList ,Linking,ActivityIndicator} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../components/cart';
import API from '../../../API/API';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import Swiper from 'react-native-swiper';
import FloatingButtons from '../../components/FloatingButtons';
const he = require('he');
import AsyncStorage from '@react-native-async-storage/async-storage'; 
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
const ProductPage = ({ route }) => {
  const { item } = route.params;
  const navigation = useNavigation();
  const { addItemToCart } = useCart();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [membershipDetails, setMembershipDetails] = useState(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [termId, setTermId] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);
  const [token1, setToken1] = useState(false);
    const [subs, setSubs] = useState('');
  useFocusEffect(
    useCallback(() => {
      const getToken = async () => {
        try {
          const storedToken = await AsyncStorage.getItem('token');
          console.log("Token fetched:", storedToken);
          setToken1(!!storedToken); // Convert to boolean
        } catch (error) {
          console.error("Error fetching token:", error);
        }
      };
      getToken();
    }, [])
  );
  // console.log("Item Data:", item.gallery_image_urls); // Log the entire item to inspect its structure
  // console.log("Item Data:", item); // Log the entire item to inspect its structure
  // console.log("Item Data:", item.categories); // Log the entire item to inspect its structure
// console.log(item);
  // Handle back button press
  useEffect(() => {
    const onBackPress = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        BackHandler.exitApp();
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    // Ensure the gallery images are updated based on the item's data
    if (item && item.gallery_image_urls && item.gallery_image_urls.length > 0) {
        setGalleryImages(item.gallery_image_urls);
    }
}, [item]);
  
useFocusEffect(
  useCallback(() => {
    let isActive = true;
    setLoading(true);

    const source = axios.CancelToken.source(); // 🔥 Cancel token for Axios request

    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Token not found');

        console.log("Fetching user data...");

        const response = await axios.get(
          'https://toyflix.in/wp-json/api/v1/user-profile/',
          {
            headers: {
              'Accept': 'application/json',
            },
            params: { token },
            timeout: 5000, // 🔥 Stops slow requests after 5 sec
            cancelToken: source.token, // Attach cancel token
          }
        );

        if (!isActive) return;

        if (response.data?.status === 200) {
          const { termId, subscription_details, nickname } = response.data.data;

          if (Array.isArray(subscription_details) && subscription_details.length > 0) {
            const recentDetail = subscription_details.reduce((latest, entry) =>
              (!latest || new Date(entry.first_purchase_date) > new Date(latest.first_purchase_date))
                ? entry
                : latest,
              null
            );

            setMembershipDetails(recentDetail);
            setHasActivePlan(recentDetail?.subscription_status === "Active");
            setSubs(recentDetail?.subscription_plan_id || null);
            setTermId(termId);
            setUserName(nickname);

            console.log("Subscription Plan ID:", recentDetail?.subscription_plan_id);
          } else {
            setMembershipDetails(null);
            setHasActivePlan(false);
            setSubs(null);
          }
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (err) {
        if (axios.isCancel(err)) {
          console.log("API request canceled:", err.message);
        } else {
          console.error('API Error:', err.message);
          Alert.alert('Error', 'Failed to fetch user data.');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchUserData();

    return () => {
      isActive = false; // Prevents setting state if the component unmounts
    };
  }, []) // Empty dependency array ensures it runs only when screen is focused
);
// Handle subscription logic and navigation
const handleSubscribeButtonPress = () => {


  if(!token1){
navigation.navigate("WithoutMemb");
  }
  else{
    const isRideOnToys = item.categories && item.categories.includes("Ride on Toys");

    if (isRideOnToys) {
        // Navigate to Delivery page if category is "ride on toys"
        navigation.navigate('Delivery', {item})
        console.log("Navigating to Payment with item:", item);

    } else {
        if (membershipDetails) {
            const { subscription_status } = membershipDetails;
         

            if (subscription_status === "Active") {
              console.log("1");
              
                if (termId === 0) {
                  console.log("2");
              
                    // Navigate to Member page if there's no term ID
                    navigation.navigate('Categories', { 
                      termId: termId || 0, 
                      memberId: subs 
                    });
                } else {
                  // console.log("Full Subscription Details  1:", membershipDetails);
                  // console.log("First Element:  2", membershipDetails); // Debugging step
                  // console.log("Subscription Plan ID:  3", membershipDetails.subscription_plan_id);
                  
                 
                    // Navigate to CategoryPage with the term ID
                    navigation.navigate('Categories', { 
                      termId: termId || 0, 
                      memberId: subs 
                    });
                }
            } else {
                // Navigate to Member page for non-active subscriptions 
                navigation.navigate('Member');
            }
        } else { 
            // Navigate to Member page if no membership details are found
            navigation.navigate('Member');
        }
    }
  }
}; 
 const handleAddToCart = () => {
    addItemToCart(item);
    alert('Product added to cart!');
  };
  const renderImageItem = ({ item }) => (
    <Image source={{ uri: item }} style={styles.image} />
  );
  return (
    <View style={styles.container}>
          
      <StatusBar style={{ backgroundColor: 'white', zIndex: -9 }} barStyle="dark-content" />
      
      <ImageBackground style={{ flex: 1 }} source={require('../../../src/newbg.png')} resizeMode="cover">
    
      <ScrollView contentContainerStyle={styles.scrollViewContainer} showsVerticalScrollIndicator={false} >

           {/* Product Image */}
           {item.image && (
                <Image source={{ uri: item.image }} style={styles.image} />
              )}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Image
              source={require('../src/Arrow.png')}
              style={styles.arrow}
            />
          </TouchableOpacity>
<View style={{top:height*0.08,}}>
          {/* Product Name */}
          {/* Gallery Image Section */}
          <View style={styles.galleryContainer}>
          
          

</View>

          <Text style={styles.name}>{item.name}</Text>
 {/* Price */}
 <View style={styles.priceContainer}>
 <Text style={styles.mrpText}>
  MRP: ₹
  <Text style={{
    textDecorationLine: 
      item.categories && item.categories.includes("Ride on Toys") 
      ? (item.regular_price.includes("1999") ? "none" : "line-through") 
      : "line-through"
  }}>
    {item.regular_price}
  </Text>
</Text>

          <Text style={styles.freeText}>{item.categories && item.categories.includes("Ride on Toys") ? " " : "Free with Subscription"}</Text>
        </View>

{/* Reference Link */}

          {/* Product Description */}
          <View style={styles.descriptionContainer}>
      <Text style={styles.description} numberOfLines={showFullDescription ? 0 : 2}>
      {removeHTMLTags(item.description)}
      </Text>
      <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
        <Text style={styles.readMoreText}>
          {showFullDescription ? 'Show less' : 'Read more'}
        </Text>
      </TouchableOpacity>
    </View>

          {/* Subscribe Button */}
          
          {/* <TouchableOpacity
  activeOpacity={0.8}
  style={styles.button}
  // disabled={loading} // Disable button while loading
  onPress={handleSubscribeButtonPress}
>
  
<Text style={styles.buttonText}>
{item.categories && item.categories.includes("Ride on Toys") ? "Rent Now" : "Subscribe Now"}
  </Text>
</TouchableOpacity> */}
{loading ? (
  // Show loading indicator when loading is true
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="large" color="#0000ff" />
  </View>
) : (
  // Show button when loading is false
  <TouchableOpacity
    activeOpacity={0.8}
    style={[
      styles.button,
      { backgroundColor: item.stock_status ? '#F22F47' : 'gray', opacity: item.stock_status ? 1 : 0.6 },
    ]}
    onPress={handleSubscribeButtonPress}
    disabled={!item.stock_status} // Disable when out of stock
  >
    <Text style={styles.buttonText}>
      {!item.stock_status ? "Out of Stock" : item.categories?.includes("Ride on Toys") ? "Rent Now" : "Subscribe Now"}
    </Text>
  </TouchableOpacity>
)}


          {/* Categories Section */}
          <View style={styles.categoriesContainer}>
            <Text style={styles.subheading}>Categories</Text>
            <Text style={styles.categories}>{item.categories}</Text>
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Product Content */}
          <Image source={require('../src/skill.png')} style={styles.content} />

          {/* Another Separator */}
          <View style={styles.separator} />
       
       {/* Reference Link Section */}
<View style={styles.referenceContainer}>
  <Text style={styles.referenceText}>FOR MORE: </Text>
  <TouchableOpacity onPress={() => Linking.openURL(item.permalink)}>
    <Text style={styles.referenceLink}>Click here</Text>
  </TouchableOpacity>
</View>
   {/* Gallery Images Section */}
   <FlatList
    data={item.gallery_image_urls}
    renderItem={({ item }) => (
        <Image
            source={{ uri: item }}
            style={styles.galleryImage}
            onError={(error) => console.log('Gallery image loading error:', error)}
        />
    )}
    keyExtractor={(item, index) => index.toString()}
    horizontal
    showsHorizontalScrollIndicator={false}
/>

{/* Adjusting for other gallery sections to maintain layout integrity */}
<FlatList
    data={galleryImages}
    renderItem={({ item }) => (
        <Image
            source={{ uri: item }}
            style={styles.galleryImage}
            onError={(error) => console.error('Gallery image loading error:', error)}
        />
    )}
    keyExtractor={(item, index) => index.toString()}
    horizontal
    showsHorizontalScrollIndicator={false}
/>

          {/* Product Details */}
          <View style={styles.detailsContainer}>
            
            {/* <Text style={styles.subheading1}>Product details</Text>
            <View style={styles.productDetails}>
              <Text style={styles.prosub}>Brand</Text>
              <Text style={styles.prosub}>Age Group</Text>
              <Text style={styles.prosub}>Material</Text>
              <Text style={styles.prosub}>Categories</Text>
            </View> */}

            {/* Explore Section */}
            {/* <Text style={styles.subheading2}>Explore</Text> */}
          </View>
           <View style={{top:height*0.01,left:-width*0.04,paddingBottom:300}}>
          {/* API Component */}
          {/* <API
            showImage
            showName
            nameStyle={styles.name}
            showPrice
            priceStyle={styles.price}
            imageStyle={styles.customImage}
            showButton
            buttonStyle={styles.button}
          /> */}
          </View>
          </View>
        </ScrollView>
        <FloatingButtons/>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  scrollViewContainer: {
    
    // paddingHorizontal: width * 0.018, // Consistent horizontal padding
    padding:15
  },
  image: {
    width: "110%",
    height: 405,
    marginBottom: height * 0.01, // Space below the image
    zIndex: -9,
    left: width * -0.044,
    top: height * 0.05,
    borderRadius:30
  },
  backButton: {
    position: 'absolute',
    top: height * 0.03,
    left: width * 0.05,
    zIndex: 10, // Ensures the back button is on top
  },
  arrow: {
    height: 20,
    width: 30,
    top:height*0.05,
    left:width*0,
  },
  readMoreText: {
    color: 'blue', // change this to your preferred color
    marginTop: 1, // add space between the description and "Read more"
    paddingHorizontal: width * 0.12, 
    textAlign:'right'
  },
  name: {
    fontFamily: 'Quicksand-SemiBold',
    fontWeight: '600',
    fontSize: width * 0.07,
    textAlign: 'center',
    marginVertical: height * 0.01, // Space above and below the name
    color: 'red',
  },
  descriptionContainer: {
    top:height*0.01,
    marginBottom: height * -0.01, // Space below the description
  },
  description: {
    color: 'black',
    fontSize: 14,
    textAlign: 'left',
    fontFamily: 'Quicksand-SemiBold',
    marginVertical: height * 0.01, // Space above and below the description text
    paddingHorizontal: width * 0.03, // Ensures equal padding on both sides
  },
  button: {
    marginVertical: height * 0.05, // Space above and below the button
    paddingVertical: height * 0.005,
    paddingHorizontal: width * 0.1,
    borderRadius: 15,
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: 'white',
    borderWidth: 5,
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 9 },
    shadowOpacity: 0.1,
    backgroundColor: '#F22F47',
  },
  buttonText: {
    fontFamily: 'Little Comet Demo Version',
    color: 'white',
    fontSize: 32,
    fontWeight: '600',
    marginTop: 9,
    
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginVertical: height * 0.01, // Space above and below the categories section
  },
  categories: {
    color: 'black',
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    paddingHorizontal: width * 0.07, // Ensures equal padding on both sides
    textAlign: 'left',
    flex: 1, // Allows the text to use available space
    
  },
  subheading: {
    textAlign: 'center',
    paddingVertical: height * -0.02, // Space above and below the subheading
    fontFamily: 'Little Comet Demo Version',
    color: 'black',
    fontSize: 20,
    fontWeight: '600',
  },
  separator: {
    borderWidth: 1,
    borderTopColor: 'white',
    width: '100%',
    marginVertical: height * 0.02, // Space above and below the separator
  },
  content: {
    // padding:20,
    height: height * 0.18,
    width:"100%",
    alignSelf: 'center',
    marginVertical: height * -0.01, // Space above and below the content
  },
  detailsContainer: {
    marginVertical: height * 0, // Space above and below the details container
  },
  subheading1: {
    textAlign: 'left',
    paddingVertical: height * -0.01, // Space above and below the subheading
    // paddingHorizontal: width * 0.05, // Consistent horizontal padding
    fontFamily: 'Little Comet Demo Version',
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  productDetails: {
    marginVertical: height * 0.01, // Space above and below the product details
    rowGap:height*-0.09
  },
  prosub: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    textAlign: 'left',
    marginVertical: height * 0.01, // Space between product details items
  },
  subheading2: {
    textAlign: 'left',
    paddingVertical: height * 0.01, // Space above and below the subheading
    fontFamily: 'Little Comet Demo Version',
    color: 'black',
    fontSize: 24,
    fontWeight: '600',
  },
  customImage: {
    width: '100%',
    height: 300,
    marginVertical: height * 0.02, // Space above and below the custom image
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent:'center'
  },
  mrpText: {
    fontSize: 16,
    color: 'black',
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
  },
  freeText: {
    fontSize: 16,
    color: 'green',
    marginLeft: 10,
    
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    padding: 10,
    borderRadius: 8,
    marginVertical: 20,
    justifyContent: 'center',
  },
  referenceText: {
    fontSize: 16,
    color: '#555',
    fontWeight: 'bold',
  },
  referenceLink: {
    fontSize: 16,
    color: '#007bff',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    galleryContainer: {
      marginVertical: 20,
      paddingHorizontal: 10,
    },
    galleryImage: {
      width: 120,       // Width of each image
      height: 100,      // Height of each image
      marginRight: 10,  // Spacing between images
      borderRadius: 8,  // Rounded corners for images
    },
    galleryContainer: {
      marginTop: 20,
      marginBottom: 20,
    },
    galleryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    swiper: {
      height: 200,
    },
    galleryImage: {
      width: 100,
      height: 100,
      marginHorizontal: 5,
      borderRadius: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: semi-transparent background overlay
    zIndex: 10, // Ensures it's on top of other components
  },
  },
});



export default ProductPage;