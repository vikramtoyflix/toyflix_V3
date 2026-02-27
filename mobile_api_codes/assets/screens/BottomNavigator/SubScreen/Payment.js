import {
    StyleSheet,
    Text,
    View,
    Dimensions,
    FlatList,
    ImageBackground,
    TouchableOpacity,
    Image,
    StatusBar,
    ScrollView,
    TouchableHighlight,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import React, { useState, useEffect } from 'react';
// import { useNavigation } from '@react-navigation/native';
import RazorpayCheckout from 'react-native-razorpay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native'; 
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const he = require('he');
const Payment = ({ route, navigation  }) => {
    const { item } = route.params || {}; 
    // const navigation = useNavigation();
    const [final, setFinal] = useState(1);
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [promoCode, setPromoCode] = useState('');
const [promoDiscount, setPromoDiscount] = useState(0); // Discount from promo code
const [promoError, setPromoError] = useState(''); // To show error if promo code is invalid
const [userId, setUserId] = useState(null);
const [showPromoInput, setShowPromoInput] = useState(false); 
const [couponCode, setCouponCode] = useState('');
    const deliveryFees = 0; // Example delivery fee
    const memberships = [
        { id: 8822, name: "Trial Plan", price: 1299 },
        { id: 7826, name: "6 Month Plan", price: 5999 },//5999
        { id: 7827, name: "6 Month Plan PRO", price: 7999 },//7999
        { id: 17801, name: "6 Month Plan PRO", price: 1 },
    ];
    useEffect(() => {
        // Log route params
        console.log("Received route params:", route.params);

        if (!route.params || !route.params.item) {
            console.error("Error: route params or item is missing.");
            return;
        }

        // Assuming `item` has an id for which we are calculating prices
        const item = route.params.item;
        console.log("Item details:", item);
        
        // Calculate prices based on the item
        calculateFinalPrices(item);
    }, [route.params]);
    
    const basePrice = 1999;
    const gstRate = 0.18; 
    const renderItem = ({ item }) => (
        <View style={styles.productItem}>
            <Text style={styles.name}>{removeHTMLTags(item.product_name)}</Text>
            <Text style={styles.quantity}>Quantity: {item.quantity}</Text>
        </View>
    );
    const calculateFinal = () => {
        console.log('Ubaseprize:', basePrice);
        const ride = calculateRide(basePrice, gstRate, deliveryFees);
        if (route?.params?.item) {
          setFinal(ride);
        } else {
          const calculatedTotal = calculateTotalWithPromo(ride, gstRate, deliveryFees);
          setFinal(calculatedTotal);
        }
      };
    
      useEffect(() => {
        if (promoDiscount > 0) {
          calculateFinal();
        }
      }, [promoDiscount]);
    const ride = basePrice && promoDiscount && gstRate
    ? ((basePrice - (basePrice * (promoDiscount / 100))) + gstRate*(basePrice - (basePrice * (promoDiscount / 100))))
    : 0;
    useEffect(() => {
        calculateFinal(); 
    }, [promoDiscount]);    
  
    console.log(final); 
    useEffect(() => {
        console.log('Updated final value:', final);
    }, [final]);
    console.log(final); 
    const calculateTotalWithPromo = (matchedPrice, gst, deliveryFees) => {
        const priceAfterPromo = promoDiscount > 0 ? matchedPrice - (matchedPrice * (promoDiscount / 100)) : matchedPrice;
        return priceAfterPromo + (priceAfterPromo * gst) + deliveryFees;
      };
      const calculateRide = (basePrice, gst, deliveryFees) => {
        const priceAfterPromo = promoDiscount > 0 ? basePrice - (basePrice * (promoDiscount / 100)) : basePrice;
        return priceAfterPromo + (priceAfterPromo * gst) + deliveryFees;
      };
    
    







const calculateGST = (price) => {
    const discountedPrice = promoDiscount > 0 ? price - (price * (promoDiscount / 100)) : price;
    console.log('Updated final gst:', discountedPrice);
    return discountedPrice * gstRate;
};


const calculateTotalAmount = (price) => {
    const discountedPrice = promoDiscount > 0 ? price - (price * (promoDiscount / 100)) : price;
    console.log('Updated final discountedPrice:', discountedPrice);
    return discountedPrice ;
};


const calculateFinalPrices = () => {
    const matchedPrice = matchedPrice || 0; // Default to 0 or any other fallback value
    console.log('Updated final discountedPrice8:', matchedPrice);
    if (route?.params?.item) {
        // If route.item is present, use basePrice
        const rideGST = calculateGST(basePrice);
        const rideTotal = calculateTotalAmount(basePrice);
        return { gst: rideGST, total: rideTotal };
    } else {
        // If route.item is not present, use matched price from memberships
        const matchedGST = calculateGST(matchedPrice);
        const matchedTotal = calculateTotalAmount(matchedPrice);
        return { gst: matchedGST, total: matchedTotal };
    }
};

// Get GST and Total values from the calculateFinalPrices function
const { gst, total } = calculateFinalPrices();
    
const handlePlaceOrder = () => {
       
        createOrder();
    };
    useEffect(() => {
        const fetchCartProducts = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) throw new Error('Token not found');

                const response = await axios.get('https://toyflix.in/wp-json/api/v1/cart', {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                    },
                    params: { token },
                });

                if (response.data.status === 'success') {
                    setProducts(response.data.products);
                } else {
                    setError('Failed to retrieve products');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCartProducts();
    }, []);
    const createOrder = async () => {
        setLoading(true);  // Start loading
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'User token is missing. Please log in again.');
                return;
            }
    
            if (products.length === 0 && !route?.params?.item) {
                Alert.alert('Error', 'No products found in the cart.');
                setLoading(false);  // Reset loading state after error
                return;
            }
    
            let productData;
            if (route?.params?.item) {
                // Single item purchase
                productData = {
                    product_id: [route.params.item.id], // Sending as array
                    name: route.params.item.name,
                    quantity: route.params.item.quantity,
                };
            } else if (products.length > 0) {
                // Multiple items in cart
                const product_ids = products.map(product => product.product_id || product.id); // Adjust based on actual property name
                productData = {
                    product_id: product_ids,
                    quantity: products.reduce((total, item) => total + item.quantity, 0),
                };
            } else {
                Alert.alert('Error', 'No products found in the cart.');
                setLoading(false);  // Reset loading state after error
                return;
            }
    
            const total_price = 1;  // Set price to 1 rupee (adjust as needed)
    
            if (productData.product_id.length === 0) {
                Alert.alert('Error', 'Product IDs are required.');
                setLoading(false);  // Reset loading state after error
                return;
            }
    
            const paymentData = {
                token,
                product_id: productData.product_id,
                price: total_price,
                payment_id: 0,
            };
    
            console.log('Sending Payment Data:', paymentData);
    
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
            console.error('Error sending payment data:', error.response ? error.response.data : error.message);
            Alert.alert('Error', `Failed to send payment data: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false); // Reset loading state when done (either success or failure)
        }
    };
    
    
    const validateCoupon = async () => {
        if (!promoCode.trim()) {
          setPromoError('Please enter a valid promo code');
          return;
        }
        try {
          const response = await axios.post('https://toyflix.in/wp-json/custom/v1/validate-coupon', {
            coupon_code: promoCode.trim(),
            user_id: userId,
            product_ids: products.map(product => product.product_id)
          });
    
          if (response.data.code === "success") {
            setPromoDiscount(response.data.data.coupon_details.amount);
            setPromoError('');
            setShowPromoInput(false);
          } else {
            setPromoError(response.data.message || 'Coupon validation failed');
            setPromoDiscount(0);
          }
        } catch (error) {
          setPromoError( 'Invalid coupon ');
          setPromoDiscount(0);
        }
      };
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
  
    const calculateTotal = (matchedPrice, gst, deliveryFees) => {
        return (matchedPrice + gst + deliveryFees).toFixed(2); // Ensure you return a string with two decimal places
    };
    const matchedProduct = products.length > 0
        ? products.find(product => memberships.some(membership => membership.id === Number(product.product_id)))
        : null;
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) throw new Error('Token not found');

                const response = await axios.get('https://toyflix.in/wp-json/api/v1/user-profile/', {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                      },
                      params: {
                        token: token,
                      },
                    });
                if (response.data && response.data.status === 200) {
                    const userData = response.data.data;
                    setMobile(userData.mobile);
                    setEmail(userData.email);
                    setUserId(userData.user_id);  // Save userId to state
                    console.log('Fetched userId:', userData.user_id);
                } else {
                    throw new Error('Unexpected response format');
                }
            } catch (err) {
                setError(err.message || 'Failed to fetch user data.');
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

  

    const removeHTMLTagsAndFormatPrice = (htmlString) => {
        let priceString = htmlString.replace(/<[^>]+>/g, ''); // Remove HTML tags
        priceString = priceString.replace(/&#8377;/g, ''); // Remove Indian Rupee symbol
        return parseFloat(priceString.trim().replace(/,|\.\d+/g, '')); // Convert to float
    };
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
      
    const matchedPrice = matchedProduct?.price ? removeHTMLTagsAndFormatPrice(matchedProduct.price) : 0;
    const gst2 = calculateGST(matchedPrice);
    // const total = calculateTotal(matchedPrice, gst, deliveryFees);

    return (
        <View style={styles.container}>
            <StatusBar style={{ backgroundColor: '#FFFFFF' }} barStyle='dark-content' />
            <ImageBackground
                style={styles.backgroundImage}
                source={require('../../../src/bg.png')}
                resizeMode="cover"
            >
                
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Image source={require('../src/arrow2.png')} style={styles.Arrow} />
                    </TouchableOpacity>
                    <Text style={styles.topheading}>Payment Method</Text>
                </View>
                {loading && (
    <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#0000ff" />
    </View>
)}

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer} >
                {/* <ScrollView contentContainerStyle={styles.scrollContainer}> */}
                <View style={{top:100,padding :20}}>
                    <View style={styles.userInfo}>
                        <Text style={styles.infoText}>Mobile: {loading ? 'Loading...' : mobile.trim() || 'N/A'}</Text>
                        <Text style={styles.infoText}>Email: {loading ? 'Loading...' : email || 'N/A'}</Text>
                    </View>
                    <View>
            {!showPromoInput ? (
                <TouchableOpacity onPress={() => setShowPromoInput(true)}>
                <Text style={styles.promoCodeLabel1}>
                    <Text style={styles.couponText}>Have a coupon? </Text>
                    <Text style={styles.enterCodeText}>Click here to enter your code</Text>
                </Text>
            </TouchableOpacity>
            
            ) : (
                <View>
                <Text style={styles.promoCodeLabel}>Enter Promo Code (Optional)</Text>
                <View style={styles.promoCodeContainer}>
                    <TextInput
                        style={styles.promoCodeInput}
                        placeholder="Enter Promo Code"
                        value={promoCode}
                        onChangeText={(text) => setPromoCode(text.toUpperCase())} // Converts input to uppercase 9915113563
                    />
                    <TouchableOpacity style={styles.promoButton} onPress={validateCoupon}>
                        <Text style={styles.promoButtonText}>Apply</Text>
                    </TouchableOpacity>
                </View>
                </View>
            )}
            {promoError ? <Text style={styles.errorText}>{promoError}</Text> : null}
        </View>

{promoError ? <Text style={styles.errorText}>{promoError}</Text> : null}
{route?.params?.item ? (
                // Render single item from route.params.item
                <View style={styles.productItem}>
                    <Text style={styles.name}>{removeHTMLTags(route.params.item.name)}</Text>
                    <Text style={styles.quantity}>Quantity: {route.params.item.quantity}</Text>
                    {/* Uncomment if you need these additional fields */}
                    {/* <Text style={styles.price}>Price: ₹{removeHTMLTagsAndFormatPrice(route.params.item.price)}</Text>
                    <Text style={styles.gst}>GST: ₹{calculateGST(route.params.item.price).toFixed(2)}</Text> */}
                </View>
            ) : (
                // Render FlatList only when products array is available
                products && products.length > 0 ? (
                    <FlatList
                        showsVerticalScrollIndicator={false}
                        data={products}
                        keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
                        renderItem={renderItem}
                    />
                ) : (
                    // Optionally add a message when no products are available
                    <Text style={styles.noData}></Text>
                )
            )}
                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryTextContainer}>
                             <Text style={styles.summaryText}>Sub Total</Text> 
                            <Text style={styles.summaryText}>GST 18%</Text>
                            <Text style={styles.summaryTotalText}>Total</Text>
                        </View> 
<View style={styles.summaryValueContainer}>
    <Text style={styles.summaryValue}>
    
  
        ₹ {promoDiscount 
    ? total.toFixed(2)
    : loading 
        ? 'Loading...'
        : route?.params?.item 
            ? basePrice.toString() 
            : matchedProduct && matchedProduct.price 
                ? removeHTMLTagsAndFormatPrice(matchedProduct.price) 
                : '0'
}
    </Text>
  
    <Text style={styles.summaryValue}>
    ₹{promoDiscount
        ? gst.toFixed(2)
        : ` ${route?.params?.item 
            ? (basePrice * gstRate).toFixed(2) 
            : gst2 > 0 
                ? gst2.toFixed(2) 
                : '0'
        }`
    }
</Text>
    <Text style={styles.summaryTotalValue}>
    ₹ {route?.params?.item 
    ? (
        // If promo discount is present, apply the discount percentage first
        promoDiscount > 0 
        ? ride
        : basePrice * gstRate + 1999
    ) 
        : calculateTotalWithPromo(matchedPrice, gstRate, deliveryFees) // Use the calculateTotal function if route item is not present
    }
</Text>
</View>
                    </View>
                                    {/* Conditionally render the Place Order button or TouchableHighlight based on total */}
                {parseFloat(final) === 0 ? (
                    <TouchableOpacity onPress={handlePlaceOrder} style={styles.submitButton}>
                        <Text style={styles.submitButtonText}>Place Order</Text>
                    </TouchableOpacity>
                ) : (
<TouchableHighlight
    onPress={async () => {
        setLoading(true); // Show loading indicator
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'User token is missing. Please log in again.');
                return;
            }

            // Determine the base price and apply promo discount
            const basePrice = route?.params?.item ? 1999 : matchedPrice;
            const promoPercentage = promoDiscount > 0 ? promoDiscount : 0; // Assuming promoDiscount is a percentage value
            const promo = (basePrice * promoPercentage) / 100; // Calculate promo discount as a percentage
            const gst = calculateGST(basePrice - promo); // Apply GST on discounted base price
            const totalAmount = Math.round((basePrice - promo + gst + deliveryFees) * 100); // Total after discount and GST

            // Prepare product data based on single item or cart items
            let productData;
            if (route?.params?.item) {
                // Single item purchase
                productData = {
                    product_id: [route.params.item.id], // Sending as array
                    name: route.params.item.name,
                    quantity: route.params.item.quantity,
                };
            } else if (products.length > 0) {
                // Multiple items in cart
                const product_ids = products.map(product => product.product_id); // Array of all product IDs
                productData = {
                    product_id: product_ids, // Sending all product IDs as an array
                    quantity: products.reduce((total, item) => total + item.quantity, 0),
                };
            } else {
                Alert.alert('Error', 'No products found in the cart.');
                return;
            }
            // Payment options for Razorpay
            const options = {
                description: '',
                image: 'https://images.app.goo.gl/jzaqMxuGS9RyGwXu5',
                currency: 'INR',
                key: 'rzp_live_0lD2pjg1XOsadc',
                amount: totalAmount,
                // amount: 1*100,
                name: 'Toyflix',
                prefill: {
                    email: email,
                    contact: mobile,
                    name: 'ToyFlix',
                },
                theme: { color: '#F37254' },
            };
            // Open Razorpay checkout
         
            const data = await RazorpayCheckout.open(options);

            // Check payment status with Razorpay's API
            const paymentId = data.razorpay_payment_id;
            const razorpayKeySecret = 'es16meKL1o5lBedwXnsR68uL'; 

            const paymentResponse = await axios.get(
                `https://api.razorpay.com/v1/payments/${paymentId}`,
                {
                    auth: {
                        username: 'rzp_live_0lD2pjg1XOsadc', 
                        password: razorpayKeySecret,
                    },
                }
            );
            const paymentStatus = paymentResponse.data.status;
            setLoading(true); 
            if (paymentStatus === 'authorized') {
                
                // Payment is only authorized, and you may want to capture it manually
                // Capture payment using Razorpay API if needed
                await axios.post(
                    `https://api.razorpay.com/v1/payments/${paymentId}/capture`,
                    { amount: totalAmount },
                    // { amount: 1*100 },
                    {
                        auth: {
                            username: 'rzp_live_0lD2pjg1XOsadc', // Replace with your actual Razorpay Key ID
                            password: razorpayKeySecret,
                        },
                    }
                );
                // Alert.alert('c');
            } else if (paymentStatus === 'captured') {
                console.log('Payment was already captured!');
            } else {
                console.log('Payment failed', 'Payment was not successful.');
                return;
            }
            // Payment successful, prepare to create order on backend
            const paymentData = {
                token: token,
                product_id: productData.product_id, // Pass all product IDs as an array
                price: basePrice - promo + gst + deliveryFees, // Total price after discounts and taxes
                payment_id: data.razorpay_payment_id || 0, // Pass Razorpay payment ID or default to 0
            };
            console.log('Sending Payment Data:', paymentData);
            // Send payment data to backend API
            const response = await axios.post('https://toyflix.in/wp-json/api/v1/create-order', paymentData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
            // Handle response from backend
            if (response.data.status === 'success') {
                const order_id = response.data.order_id;
                setLoading(true);  // Reset loading state after error
                if (!route.params?.item) {
                    await deleteAllItemsFromCart(); // Clear cart only if it's a cart purchase
                }
                Alert.alert('Order Placed Successfully!', `Order ID: ${order_id}`);
                navigation.navigate('Home1');
            } else {
                Alert.alert('Failed to create order', response.data.message || 'Unknown error.');
            }
        } catch (error) {
            console.error('Error sending payment data:', error.response ? error.response.data : error.message);
            Alert.alert('Error', `Failed to send payment data: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false); // Reset loading state
        }
    }}
    style={styles.payButton}
>
    <Text style={styles.payButtonText}>Pay with Razorpay</Text>
</TouchableHighlight>

    )}
                    </View>
                </ScrollView>
               
            </ImageBackground>
        </View>
    );
};
export default Payment;
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: height * 0.05,
        left: 15,
        zIndex: 999,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 10,
    },
    Arrow: {
        height: 24,
        width: 26,
    },
    topheading: {
        fontSize: width * 0.06,
        color: 'white',
        fontWeight: 'bold',
        marginLeft: width * 0.14,
    },
    scrollContainer: {
        // padding: height * 0.02,
        // paddingTop: height * 0.12,
        paddingBottom:200
    },
    userInfo: {
        marginBottom: 20,
    },
    infoText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Urbanist-Regular',
        marginBottom: 8,
    },
    productItem: {
        padding: 12,
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 12,
    },
    name: {
        color: 'black',
        fontSize: 16,
    },
    quantity: {
        color: 'black',
        fontSize: 14,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 8,
        backgroundColor: '#000',
    },
    summaryTextContainer: {
        flexDirection: 'column',
    },
    summaryText: {
        color: '#ccc',
        fontSize: 14,
    },
    summaryTotalText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    summaryValueContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    summaryValue: {
        color: '#ccc',
        fontSize: 14,
    },
    summaryTotalValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    payButton: {
        backgroundColor: '#f37254',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
        marginTop: 30,
        alignSelf: 'center',
    },
    payButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    promoCodeContainer: {
        top:height*-0.02,
        padding :20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    promoCodeInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        color:"white"
    },
    promoButton: {
       backgroundColor: '#FF6F61',
        padding: 10,
        marginLeft: 10,
        borderRadius: 5,
    },
    promoButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        top:height*-0.03,
        textAlign:'center'
    },
    promoCodeLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'yellow',
        marginBottom: 30, // space between label and input field
         textAlign:'center'
      },
      promoCodeLabel1: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 30, // space between label and input field
         textAlign:'center'
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
  
    couponText: {
        color: 'yellow',
        fontSize: 16,
        fontWeight: 'bold',
    },
    enterCodeText: {
        color: 'green',
        fontSize: 16,
        fontWeight: 'bold',
        // textDecorationLine: 'underline', // Makes it look like a link
    },
    submitButton: {
        backgroundColor: '#FF6F61',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,  
    },
    
});
