import React, { useState, useEffect,useCallback } from 'react';
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, TextInput, Dimensions, BackHandler, Alert, ScrollView, StatusBar, FlatList, TouchableWithoutFeedback, SafeAreaView ,ActivityIndicator} from 'react-native';
import { Image } from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import Swiper from './components/Swiper';
import API from '../../API/API';
import axios from 'axios';
import { useCart } from './components/cart';
import { debounce } from 'lodash';
import RideonToy from '../../API/RideonToy';
const { width, height } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingButtons from '../components/FloatingButtons';
import { useFocusEffect } from '@react-navigation/native';

const Home = () => {
  const navigation = useNavigation();
  const { cartLength } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [products, setProducts] = useState([]);
  const [responseStatus, setResponseStatus] = useState(null); 
  const [membershipDetails, setMembershipDetails] = useState(null);
  const [termId, setTermId] = useState('');
  const [subs, setSubs] = useState('');
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [token1, setToken1] = useState(false);
  
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
  


  useEffect(() => {
    if (Platform.OS === 'android') {
      const backAction = () => {
        Alert.alert('Exit App', 'Are you sure you want to exit?', [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          {
            text: 'YES',
            onPress: () => BackHandler.exitApp(),
          },
        ]);
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => backHandler.remove();
    }
  }, []);
  

  

  useFocusEffect(
    React.useCallback(() => {
      // No need for additional back handling on iOS as the swipe back gesture is default
      return () => {
        setShowResults(false); // Reset the search results when navigating away from the page
      };
    }, [])
  );
  useFocusEffect(
    React.useCallback(() => {
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
            setProducts(response.data.products); // Ensure products are updated
            setResponseStatus('success');
          } else {
            setProducts([]); // Empty the cart if no products are found
            setResponseStatus(404);
          }
        } catch (err) {
          setProducts([]); // Set an empty cart in case of errors
          setResponseStatus(404);
        }
      };
  
      fetchCartProducts();
  
    }, []) // Add products as a dependency if needed
  );
  
  
  useFocusEffect(
    useCallback(() => {
      let isActive = true; // To prevent state updates on unmounted components
  
      const fetchUserName = async () => {
        try {
          setLoading(true);
          const token = await AsyncStorage.getItem('token');
  
          if (!token) throw new Error('Token not found');
  
          const response = await axios.get(
            'https://toyflix.in/wp-json/api/v1/user-profile/',
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
              },
              params: { token },
            }
          );
  
          if (response.data?.status === 200 && isActive) {
            const userData = response.data.data;
            const { termId, subscription_details } = userData;
            setUserName(userData.nickname || '');
            if (Array.isArray(subscription_details)) {
              const recentDetail = subscription_details.reduce((latest, entry) => {
                const currentDate = new Date(entry.first_purchase_date);
                return (!latest || currentDate > new Date(latest.first_purchase_date)) ? entry : latest;
              }, null);
  
              if (recentDetail) {
                setMembershipDetails(recentDetail);
                setHasActivePlan(recentDetail.subscription_status === "Active");
                setSubs(recentDetail.subscription_plan_id);
              } else {
                setMembershipDetails(null);
                setHasActivePlan(false);
              }
            }
            setTermId(termId);
          }
        } catch (err) {
          console.log('Error fetching user data:', err);
        } finally {
          setLoading(false);
        }
      };
  
      fetchUserName();
  
      return () => {
        isActive = false; // Prevents setting state if the component unmounts
      };
    }, []) // Empty dependency array ensures it runs only when screen is focused
  );


  const handleSubscribeButtonPress = () => {
    console.log("hellooo");
    console.log("Button Pressed");
    console.log("Membership Details:", membershipDetails);
    console.log("Membership Details:", token1);
    
    if (!token1) {
      // No active plan, show alert
      Alert.alert(
          "Guest Account",
          "You are currently in a guest account. Please register to access this feature.",
          [{ text: "Register", onPress: () => navigation.navigate('Login') }]
      );
  } 
 else{
    if (membershipDetails) {
      const { subscription_status } = membershipDetails;
      console.log("Subscription Status:", subscription_status);
      
      if (subscription_status === "Active") {
        console.log("Active subscription",subs);
        navigation.navigate('Categories', { 
          termId: termId || 0, 
          memberId: subs 
        });
        
      } else {
        console.log("Navigating to Member (inactive subscription)");
        navigation.navigate('Member');
      }
    } else {
      console.log("Navigating to Member (no membership details)");
      navigation.navigate('Member');
    }
  }
  };
  
  
   
  
  const handleTextChange = (text) => {
    setSearchTerm(text);
    if (text.length > 0) {
      navigation.navigate('SearchResults', { searchTerm: text });
    }
  };
  const handleResultPress = (item) => {
    console.log("ProductPage",item);
    navigation.navigate('ProductPage', {item})
    setShowResults(false);
  };

  const handleOverlayPress = () => {
    console.log("Overlay pressed, hiding results.");
    setShowResults(false);
  };
  
  useEffect(() => {
    const backAction = () => {
      Alert.alert('Hold on!', 'Are you sure you want to go back?', [
        {
          text: 'Cancel',
          onPress: () => null,
          style: 'cancel',
        },
        {
          text: 'YES',
          onPress: () => {
            if (Platform.OS === 'ios') {
              // Simulate back button action on iOS
              navigation.goBack(); // Go back to the previous screen
            } else {
              // For Android, we let BackHandler close the app or go back
              BackHandler.exitApp();
            }
          },
        },
      ]);
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove(); // Cleanup on unmount
  }, [navigation]);
  const handleMyPlansPress = () => {
    console.log('Membership Details:', membershipDetails); // Log the membership details to debug
    if (membershipDetails) {
      navigation.navigate('TestLinking'); // Navigate to TestLinking if membershipDetails exist
    } else {
      navigation.navigate('Member'); // Navigate to Member if membershipDetails do not exist
    }
  };
  

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor='#174C8F' barStyle='dark-content' />
      <ImageBackground
        style={{ flex: 1 }}
        source={require('../../src/newbg.png')} //newbg
        resizeMode="cover"
      >
        {loading && (
                                                <View style={styles.loadingOverlay}>
                                            <ActivityIndicator size="large" color="#0000ff" />
                                        </View>
                                    )}
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* <FloatingButtons/> */}
          <View style={{top:height*-0.02}}>
          <View>
            <View style={styles.iconsContainer}>
              <View style={{ flexDirection: 'column' }}>
                <Text style={styles.toptext} animation="fadeInRight" duration={2000}>
                Welcome {token1 ? userName : "Guest"}!

                </Text>
              </View>
              
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate("CartPage")}>
  <Animatable.Image
    source={
      responseStatus === 'success' && products.length > 0 // Check if the cart has products
        ? require('../BottomNavigator/src/Addcart.png') // Image for a full cart
        : require('../BottomNavigator/src/Ecart.png')   // Image for an empty cart
    }
    style={styles.icons}
    animation="fadeInRight"
    duration={2000}
  />
</TouchableOpacity>




            </View>
            <View>
            {/* <View>
             <View style={styles.searchbox1}>
        <TextInput
          style={styles.searchbox}
          placeholder='Search'
          placeholderTextColor={"grey"}
          value={searchTerm}
          onChangeText={handleTextChange}  // Start search on pressing enter/return key
        />
        <TouchableOpacity >
          <Image
            source={require('../BottomNavigator/src/search.png')}
            style={{ height: 20, width: 20, left: width * -0.7 }}
          />
        </TouchableOpacity>
      </View> */}

              <View style={{ left: width *0.001,top:height*-0.02 }}>
                <Swiper />
              </View>
              {/* <View style={{ borderColor: 'white', borderWidth: 0.5, top: height * -0.007, marginRight: width * 0.08, marginLeft: width * 0.08 }}></View> */}
<View>
  <View style={{alignItems:'center',top:height*-0.03,left:width*-0.012}}>
<Image
            source={require('../../src/new1.png')}
            style={{ height: 330, width: 355}}
          />
          </View>
                  {/* <View style={{ borderColor: 'white', borderWidth: 0.5, top: height * -0.049, marginRight: width * 0.08, marginLeft: width * 0.08 }}></View> */}
                  <View style={{ top: height * 0 }}>
                    <Text style={styles.exploretoys}>Rent Toys</Text>
                    <View style={{top:-height*0.02}}>
                    <View style={styles.viewAllButton}>
                      <TouchableOpacity onPress={handleSubscribeButtonPress}>
                        <Image
                          style={styles.viewAllImage}
                          source={require('../BottomNavigator/src/viewall.png')}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={{ top: height * 0 }}>
                      <API
                        showImage
                        showName
                        nameStyle={styles.name}
                        showPrice
                        priceStyle={styles.price}
                        imageStyle={styles.customImage}
                        showButton
                        buttonStyle={styles.button}
                        nav={() => navigation.navigate('showPermalink')}
                      />
                    </View>
                    </View>
                  </View>
                  <View style={{ paddingTop: height * 0.01 }}>
                    <Text style={styles.exploretoys}>Ride on Toys</Text>
                    <View style={{top:-height*0.02}}>
                    <View style={styles.viewAllButton}>
                      <TouchableOpacity onPress={() => navigation.navigate('RideOnToy')}>
                        <Image
                          style={styles.viewAllImage}
                          source={require('../BottomNavigator/src/viewall.png')}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={{ top: height * 0 }}>
                      <RideonToy
                        showImage
                        showName
                        nameStyle={styles.name}
                        showPrice
                        priceStyle={styles.price}
                        imageStyle={styles.customImage}
                        showButton
                        buttonStyle={styles.button}
                        nav={() => navigation.navigate('showPermalink')}
                      />
                      </View>
                    </View>
                  </View>
                 < View>
  <View style={{alignItems:'center',marginTop:height*-0,left:width*0.2}}/>
<Image
            source={require('../../src/footer.png')}
            style={{ height: height*0.35, width:"100%",}}
          />
          </View>
                </View>
              {/* </ScrollView> */}
              {showResults && (
                <TouchableWithoutFeedback onPress={handleOverlayPress}>
                  <View style={styles.overlay}>
                    <FlatList
                      data={searchResults.slice(0, 5)} // Show only the first 5 results
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.resultItem}
                          onPress={() => handleResultPress(item.permalink)}
                        >
                          <Text style={styles.resultText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </TouchableWithoutFeedback>
              )}
            </View>
          </View>
          
          </View>
          
        </ScrollView>
        {/* <FloatingButtons/> */}
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  icons: {
    height: height * 0.026,
    width: width * 0.06,
    right: width * 0.060,
    top: height * -0.006,
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: height * 0.04,
    marginRight: width * 0.05,
    columnGap: width * 0.044,
  },
  Profile: {
    height: height * 0.06,
    width: height * 0.06,
    marginLeft: -width * 0.59,
  },
  toptext: {
    marginTop: -height * 0.0,
    marginLeft: -width * 0.75,
    fontFamily: 'Quicksand-SemiBold',
    fontSize: width * 0.05,
    color: '#0D2D54',
    fontWeight: "600"
  },
  searchbox: {
    width: width * 0.70,
    height: height * 0.06,
    textAlign: 'center',
    alignSelf: 'center',
    borderRadius: width * 0.2,
    left: width * 0.032,
    color: "black",
    fontSize: 14,
    fontFamily: 'Quicksand-SemiBold',
    fontWeight: '700',
  },
  searchbox1: {
    width: width * 0.83,
    height: height * 0.045,
    marginLeft: width * 0.082,
    borderRadius: width * 0.2,
    marginTop: height * 0.01,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "white",
    flexDirection: 'row'
  },
  topswipe: {
    height: height * 0.2,
    width: width * 0.82,
    borderRadius: width * 0.025,
    borderWidth: 1,
    top: height * 0.04,
    alignSelf: 'center',
    borderColor: 'transparent',
  },
  Categories: {
    fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: width * 0.06,
    color: '#0D2D54',
    top: height * 0.02,
    left: width * 0.09,
  },
  exploretoys: {
    fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: width * 0.06,
    color: '#0D2D54',
    top: -height * 0.02,
    left: width * 0.09,
  },
  categoryCircle: {
    height: width * 0.29,
    width: width * 0.29,
    borderRadius: width * 0.26,
    top: height * 0.06,
    left: width * 0.07,
  },
  overlay: {
    position: 'absolute',
    top: height * 0.14,
    left: width * 0.05,
    right: width * 0.05,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
    elevation: 5,
  },
  resultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  resultText: {
    fontSize: 16,
    color: '#333',
  },
  viewAllButton: {
    top: height * -0.03,
    flexDirection: 'row',
    alignSelf: 'flex-end',
    right: width * 0.1,
  },
  viewAllImage: {
    height: height * 0.02,
    width: width * 0.18,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    top:10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: Adds a semi-transparent background
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
});
export default Home;
