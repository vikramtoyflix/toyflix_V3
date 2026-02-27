import React, { useRef, useEffect, useState,useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Dimensions, TouchableOpacity, Text, Alert ,TextInput,ScrollView,ImageBackground,Image, ActivityIndicator} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import axios from 'axios'; // Make sure to import axios if not already done
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage for token storage
import { PermissionsAndroid } from 'react-native';
const { width, height } = Dimensions.get('window');
const Delivery = ({ route }) => {
    const { item } = route.params || {}; 
    const [location, setLocation] = useState({
        latitude: 37.78825, // Default location
        longitude: -122.4324,
    }); 
    const navigation = useNavigation();
    const [userName, setUserName] = useState('');
    const [membershipDetails, setMembershipDetails] = useState(null);
    const [hasActivePlan, setHasActivePlan] = useState(false);

    const [selectedState, setSelectedState] = useState(''); 
    const [products, setProducts] = useState([]);
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [termId, setTermId] = useState('');
    const [newmemb, setNewmemb] = useState(false);
        const [formData, setFormData] = useState({
        name: '',
        phone: '',
        pincode: '',
        house_number: '',
        roadName: '',
        city: '',
        orderNotes:''

    });
    const validPincodes = [
        "560002", "560004", "560011", "560018", "560019", "560027", "560028", "560029", "560030", "560031", "560034", "560041", 
        "560047", "560050", "560056", "560059", "560061", "560062", "560068", "560069", "560070", "560072", "560074", "560076", 
        "560078", "560081", "560083", "560085", "560091", "560095", "560098", "560099", "560100", "560102", "562107", "560006", 
        "560013", "560014", "560015", "560022", "560024", "560032", "560044", "560045", "560052", "560053", "560054", "560055", 
        "560057", "560058", "560063", "560064", "560065", "560073", "560080", "560089", "560090", "560092", "560094", "560096", 
        "560097", "560104", "562110", "562149", "560001", "560003", "560005", "560007", "560008", "560009", "560010", "560012", 
        "560016", "560017", "560020", "560021", "560023", "560025", "560026", "560033", "560035", "560036", "560037", "560038", 
        "560039", "560040", "560042", "560043", "560046", "560048", "560049", "560051", "560066", "560067", "560071", "560075", 
        "560077", "560079", "560084", "560086", "560087", "560091", "560093", "560103"
    ];   
    console.log('Item received in Delivery:', item);
    const mapRef = useRef(null);
    const requestLocationPermission = async () => {
        if (Platform.OS === 'ios') {
            fetchCurrentLocation(); // Directly try to fetch location
        } else {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'This app needs access to your location.',
                    }
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    fetchCurrentLocation();
                } else {
                    Alert.alert('Permission Denied', 'Location permission is required to fetch your location.');
                }
            } catch (err) {
                console.warn(err);
            }
        }
    };
    const fetchCurrentLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });
            },
            (error) => {
                // console.log('Error', `Unable to retrieve location. Error code: ${error.code}`);
            },
            { enableHighAccuracy: true, timeout: 60000, maximumAge: 1000 }
        );
    };
    useEffect(() => {
        requestLocationPermission();
    }, []);

useEffect(() => {
    const fetchData = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('Token not found');
            }

            // console.log("Token used for API call:", token);

            const response = await axios.get('https://toyflix.in/wp-json/api/v1/get-order-address', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                params: { token }
            });

            if (response.status === 200 && response.data && response.data.data) {
                setFormData(prevData => ({
                    ...prevData,
                    ...response.data.data
                }));
                console.log("user orrderrr data ",formData)
            } else {
                // console.log('No data available');
            }
        } catch (err) {
            // setError('Failed to fetch data');
            // console.error('Error fetching data:', err.response ? err.response.data : err.message);
            if (err.response && err.response.status === 403) {
                setError('Your session has expired. Please log in again.');
            }
        } finally {
            setLoading(false);
        }
    };

    fetchData();
}, []);
// handleInputChange function
const handleInputChange = (field, value) => {
    setFormData(prevData => ({
        ...prevData,
        [field]: value
    }));

    console.log("order notess",formData)
};
useEffect(() => {
      const fetchUserName = async () => {
        try {
          setLoading(true); // Set loading to true
          const token = await AsyncStorage.getItem('token'); // Fetch the token from AsyncStorage
          
          if (!token) {
            throw new Error('Token not found'); // Throw error if no token
          }
  
        //   console.log('Token:', token); // Log the token for debugging
  
          // Fetch the user profile
          const response = await axios.get(
            'https://toyflix.in/wp-json/api/v1/user-profile/', // Replace with your user profile endpoint
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded', // Adjust based on your API needs
                'Accept': 'application/json',
              },
              params: {
                token: token, // Send the token as a query parameter
              },
            }
          );
  
        //   console.log('API Response:', response.data); // Log the API response for debugging
  
          if (response.data && response.data.status === 200) {
            const userData = response.data.data;
            const { termId, subscription_details } = userData;
            
            // if (subscription_details) { // Check if subscription_details exists
            //   setMembershipDetails(subscription_details); // No need for [0] as it's an object
              
              const userNameFromAPI = userData.nickname; // Extract username
              setUserName(userNameFromAPI); // Set username to state
            //   setHasActivePlan(subscription_details.subscription_status === "Active"); // Set active plan status
            //   setTermId(termId); // Set termId
            // } else {
            //   // Handle if subscription_details is null or missing
            //   setMembershipDetails(null);
            //   setHasActivePlan(false);
            //   setTermId(null);
            // }
            if (subscription_details) { // Check if subscription_details exists
                const userNameFromAPI = userData.nickname; // Extract username
                setUserName(userNameFromAPI); // Set username to state
                if (subscription_details && Array.isArray(subscription_details)) { // Check if subscription_details is an array
                  // Find the entry with the most recent first_purchase_date
                  const recentDetail = subscription_details.reduce((latest, entry) => {
                    const currentDate = new Date(entry.first_purchase_date);
                    return (!latest || currentDate > new Date(latest.first_purchase_date)) ? entry : latest;
                  }, null);
      
                  if (recentDetail) {
                    setMembershipDetails(recentDetail); // Set only the most recent membership detail
                    setHasActivePlan(recentDetail.subscription_status === "Active"); // Set active plan status
                    setTermId(termId);
                  } else {
                    setMembershipDetails(null);
                    setHasActivePlan(false);
                    setTermId(null);
                  }
                }
            }
          } else {
            setMembershipDetails(null);
            setHasActivePlan(false);
            setTermId(null);
            throw new Error('Unexpected response format');
          }
          
          
        } catch (err) {
          if (err.response) {
            // console.log('API Response Error:', err.response.data); // Log the response error data
        //  
          } else {
            // console.error('Error fetching username:', err); // Log general error
            setError(err.message || 'Failed to fetch username.'); // Set error message
          }
        } finally {
          setLoading(false); // Set loading to false
        }
      };
  
      fetchUserName(); // Call the fetch function
  
      return navigation.addListener('focus', fetchUserName);
    }, []);  

    const handleMyPlansPress = () => {
        // console.log('Membership Details:', membershipDetails); // Log the membership details to debug
        if (membershipDetails) {
            setModalVisible(true); // Show the overlay
        } else {
            Alert.alert(
                "No Active Plan",
                "You don't have any active plans. Please subscribe to one.",
                [{ text: "Membership", onPress: () => navigation.navigate('Member') }]
            );
        }
    };
    const deleteItemFromCart = async (productId) => {
        if (!productId) {
        //   console.error("Product ID is undefined");
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
        //   console.log('Error deleting product:', err.response ? err.response.data : err.message);
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
        //   console.error('Error deleting all products:', error);
        } finally {
          setIsDeleting(false); // Reset loading state
        }
      };
      const createOrder = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'User token is missing. Please log in again.');
                return;
            }
    
            if (products.length === 0) {
                Alert.alert('Error', 'No products found in the cart.');
                setLoading(false);  // Reset loading state after error
                return;
            }
    
            // Collect all product IDs
            const product_id = products.map(product => product.product_id);
    
            // Explicitly set the total price to 1
            const total_price = 1;  // Set price to 1 rupee
    
            // Check if there are products and total price is valid
            if (product_id.length === 0) {
                Alert.alert('Error', 'Product IDs are required.');
                setLoading(false);  // Reset loading state after error
                return;
            }

            // Create the payment data, sending all product IDs and the fixed price
            const paymentData = {
                token,
                product_id, // Sends all product IDs as an array
                price: total_price, // Send 1 rupee as price
                payment_id: 0, // Assuming 0 is valid for the initial order
            };
    
            // console.log('Sending Payment Data:', paymentData); // Log payment data for debugging
    
            const response = await axios.post(
                'https://toyflix.in/wp-json/api/v1/create-order',
                paymentData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }
            );
    
            if (response.data.status === 'success') {
                const order_id = response.data.order_id;
                await deleteAllItemsFromCart();
                Alert.alert('Order Placed Successfully!', `Order ID: ${order_id}`);
                navigation.navigate('Home1');
            } else {
                Alert.alert('Failed to create order: ' + (response.data.message || 'Unknown error.'));
            }
        } catch (error) {
            // console.error('Error sending payment data:', error.response ? error.response.data : error.message);
            Alert.alert('Error', `Failed to send payment data: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false); // Reset loading state when done (either success or failure)
        }
    };
 
    useEffect(() => {
        const fetchCartProducts = async () => {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setError('Token not found');
                setLoading(false);
                return;
            }
            try {
                const response = await axios.get('https://toyflix.in/wp-json/api/v1/cart', {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                    },
                    params: { token },
                });

                if (response.data.status === 'success') {
                    setProducts(response.data.products);

                    // List of target product names
                    const targetProducts = ["6 Month Plan", "6 Month Plan PRO", "Trial Plan"];

                    // Check if any product in the cart matches the target products
                    const hasSpecialPlan = response.data.products.some(item =>
                        targetProducts.includes(item.product_name) // Compare directly with product_name
                    );

                    setNewmemb(hasSpecialPlan); // Set newmemb to true if any special plan is found
                } else {
                    setError('Failed to retrieve products');
                }
            } catch (err) {
                // setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCartProducts();
    }, []); // Empty dependency array to run the effect once
    // console.log('newmemb',newmemb);
    // console.log('route',route?.params?.item);
    const handleSubmit = async () => {
        if (loading) return; // Prevent multiple clicks when loading
        const { name, phone, pincode, house_number, roadName, city , orderNotes } = formData;

console.log("orderrr notee",formData);

        const isPincodeValid = pincode.length === 6;
        const isPhoneValid = phone.length === 10 && /^\d+$/.test(phone); // Check for 10 digits and only numbers
          if (!location) {
             Alert.alert('Error', 'Please use the "Use Current Location" button to retrieve your location.');
            return;
          }
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter your name.');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('Error', 'Please enter your phone number.');
            return;
        }
        if (!isPhoneValid) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number with only numbers.');
            return;
        }
        if (!pincode.trim()) {
            Alert.alert('Error', 'Please enter your pincode.');
            return;
        }
        if (!validPincodes.includes(String(pincode))) {
            Alert.alert('Error', 'This Pincode is not serviceable.');
            return;
        }             
        if (!house_number.trim()) {
            Alert.alert('Error', 'Please enter your house number.');
            return;
        }
        if (!roadName.trim()) {
            Alert.alert('Error', 'Please enter your street address.');
            return;
        }
        if (!city.trim()) {
            Alert.alert('Error', 'Please enter your town/city.');
            return;
        }
        // if (!orderNotes.trim()) {
        //     Alert.alert('Error', 'Please enter your order notes.');
        //     return;
        // }

        setLoading(true); // Set loading to true before submitting
    
        // Proceed if all fields are valid
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('Token not found');
            }
    
            const data = {
                            latitude: String(location.latitude),
               longitude: String(location.longitude),
                token: token,
                name: name,
                phone: phone,
                pincode: pincode,
                house_number: house_number,
                street_address: roadName,
                city: city,
                order_notes: orderNotes,
            };
    // console.log("addresss data for sending in api",data);
            const response = await axios.post('https://toyflix.in/wp-json/api/v1/update-order-address', data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                params: {
                    token: token,
                },
            });
    
            if (response.data.status === 200) {
                // Handle the navigation based on conditions
               if (route?.params?.item) {
                    // User has a route item, navigate to Payment page with item
                    navigation.navigate('Payment',  {item});
                    // console.log("Navigating  item:",item);
                    item
                }
                else if  (newmemb) {
                    // If newmemb is true, navigate directly to Payment page
                    navigation.navigate('Payment');
                    // console.log("Navigating  newmemb:");
                }  else if (hasActivePlan) {
                    // User has an active plan, create order and then delete cart items 
                    await createOrder();
                } else {
                    // No active plan and no route item, navigate to Payment page
                    navigation.navigate('Payment');
                    // console.log("Navigating  false:");
                }
                
            } else {
                Alert.alert('Error', 'Failed to update address.');
            }
        } catch (error) {
            // console.error('Error submitting address:', error);
            Alert.alert('Error', 'An error occurred while updating your address.');
        } finally {
            setLoading(false); // Reset loading state after submission
        }
    };
    // const handleInputChange = (name, value) => {
    //     setFormData({ ...formData, [name]: value });
    // };
    return (
        
        <ImageBackground
                    style={{ flex: 1 }}
                    source={require('../../../src/111.png')}
                    resizeMode="cover"
                >
                    <View style={{top:height*-0.05
                    }}>
                        <View style={styles.topbar}>
                            <TouchableOpacity onPress={() => navigation.goBack("")} style={{ zIndex: 10 }}>
                                <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
                            </TouchableOpacity>
                            <Text style={styles.topheading}>Select Delivery Address</Text>
                        </View>
                      
            {loading && (
                        <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            )}
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollViewContainer} >
            {location.latitude && location.longitude ? ( 
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }}
                showsUserLocation={true}
                onRegionChangeComplete={(region) => {
}}  />  ) : null}
            <TouchableOpacity style={styles.button} onPress={fetchCurrentLocation}>
                <Text style={styles.buttonText}>Use Current Location</Text>
            </TouchableOpacity>
            <Text style={styles.orText}>Please Fill this For Smooth Delivery </Text>
                 {/* Form Fields */}
                 <View style={styles.formContainer}>
            {error && <Text style={styles.error}>{error}</Text>}
            <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={"black"}
                onChangeText={(value) => handleInputChange('name', value)}
                value={formData.name}
                required
            />
            <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={"black"}
                maxLength={10}
                keyboardType="phone-pad"
                onChangeText={(value) => handleInputChange('phone', value)}
                value={formData.phone}
                required
            />
            <TextInput
                style={styles.input}
                placeholder="House Number / Apartment name"
                placeholderTextColor={"black"}
                onChangeText={(value) => handleInputChange('house_number', value)}
                value={formData.house_number}
                required
            />
            <TextInput
                style={styles.input}
                placeholder="Street Address including Apartment / Suite"
                placeholderTextColor={"black"}
                onChangeText={(value) => handleInputChange('roadName', value)}
                value={formData.roadName}
                required
            />
            <TextInput
                style={styles.input}
                placeholder="Town / City"
                placeholderTextColor={"black"}
                onChangeText={(value) => handleInputChange('city', value)}
                value={formData.city}
                required
            />
            <TextInput
                style={styles.input}
                placeholder="Pincode"
                placeholderTextColor={"black"}
                keyboardType="numeric"
                maxLength={6}
                onChangeText={(value) => handleInputChange('pincode', value)}
                value={formData.pincode}
                required
            />
            <View style={styles.container2}>
                <Text style={styles.sectionTitle}>Additional Information</Text>
                <Text style={styles.subTitle}>Order Notes (optional)</Text>
                <Text style={styles.description}>Notes about your order, e.g. special notes for delivery.</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Enter your notes here..."
                    onChangeText={(value) =>{ handleInputChange('orderNotes', value)
console.log("hellooooooo");
                }}
                    value={formData.orderNotes}
                    multiline={true}
                    numberOfLines={4}
                />
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                {/* <Text style={styles.submitButtonText}>Place Order</Text> */}
                <Text style={styles.submitButtonText}>
                {newmemb ? "Continue" : route.params?.item ? "Continue" : hasActivePlan ? "Place Order" : "Continue"}

</Text>


            </TouchableOpacity>
        </View>
                </ScrollView>    
        </View>
        </View> 
    </ImageBackground>

    );
};

const styles = StyleSheet.create({
    container: {
        // flex: 1,
        justifyContent: 'flex-start',
        top: height * 0.05,
        // paddingBottom:1000

    },
    container1: {
        flex: 1,
    },
     loadingContainer: {
        top:10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: Adds a semi-transparent background
    },
    map: {
        width: '100%',
        height: height * 0.3, // Adjust the height as needed
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
    button: {
        backgroundColor: '#0D2D54',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        margin: 20,
    },
    scrollViewContainer: {
       paddingBottom:600
      },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
        icon: {
        height: 20,
        width: 20,
        marginRight: 10,
    },
    name: {
        color: '#0D2D54',
        fontSize: 16,
    },
    orText: {
        textAlign: 'center',
        fontSize: 18,
        color: '#0D2D54',
        marginVertical: height * 0.02,
    },
        topbar: {
        height: height * 0.12,
        backgroundColor: 'white',
        justifyContent: 'center',
        top: height * 0.049,
    },
    topheading: {
        fontFamily: 'Little Comet Demo Version',
        fontWeight: '600',
        fontSize: width * 0.07,
        color: '#0D2D54',
        textAlign: 'center',
        top: height * 0.019,
        left: width * 0.06,
    },
    formContainer: {
        margin: 20,
    },
    input: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
        borderRadius: 5,
        backgroundColor: 'white',
        color:'black'
    },
    Arrow: {
                height: 20,
                width: 30,
                top: height * 0.045,
                left: width * 0.04,
                tintColor: '#0D2D54',
            },
    submitButton: {
        backgroundColor: '#0D2D54',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,  
    },
    container2: {
        padding: 16, // Adjust as needed to fit your design
        backgroundColor: '#fff',
      },
      sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color:"black"
      },
      subTitle: {
        fontSize: 16,
        marginBottom: 5,
         color:"black"
      },
      description: {
        fontSize: 14,
        color: '#555', // Use a light color for description
        marginBottom: 10,
      },
      textArea: {
        height: 100, // Adjust based on the number of lines you want
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        textAlignVertical: 'top', // Ensures the text starts from the top of the input
        fontSize: 14,
        backgroundColor: '#f9f9f9', // Light background for the text area
        color:"black"
      },
    
});

export default Delivery;
