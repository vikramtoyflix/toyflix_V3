import axios from 'axios';
import { StyleSheet, Text, View, ImageBackground, TextInput, TouchableOpacity, ScrollView, Alert, Dimensions, PixelRatio, Platform, StatusBar, ActivityIndicator 
 , Animated, } from 'react-native';
import React, { useState,useEffect,useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import auth from '@react-native-firebase/auth';
import { Keyboard,  Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { getFcmToken ,registerListenerWithFCM }  from "../notification/NotifictionService"
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 320;

function normalize(size) {
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - (Platform.OS === 'ios' ? 0 : 2);
}
const Newuser = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [f1, setF1] = useState('');
  const translateY = useRef(new Animated.Value(0)).current;
  const [f2, setF2] = useState('');
  const [f3, setF3] = useState('');
  const [f4, setF4] = useState('');
  const [otp, setOtp] = useState('');
  const [otp1, setOtp1] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const isPhoneValid = f1.length === 10;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f3);
  const isPincodeValid = f4.length === 6;
  const isFormValid = f1 !== '' && f2 !== '' && f3 !== '' && f4 !== '' ;
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
 const handleKeyboardShow = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };
  const handleKeyboardHide = () => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };
  const handlePhoneVerification = async () => {
    if (!isPhoneValid) {
      Alert.alert('Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const headers = {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      };
  
      const formData = new FormData();
      formData.append('phone', f1.trim());
  
      const response = await axios.post(
        'https://toyflix.in/wp-json/api/v1/check-phone-exists/',
        formData,
        { headers, timeout: 15000 }
      );
      console.log("heeeloooo",response);
      if (response.status === 200) {
        if (response.data.status === 404) {
          console.log("Sending OTP...");
  
          // Use FormData with x-www-form-urlencoded format
          const formData = new URLSearchParams();
          formData.append('phone_number', `+91${f1}`);
      
          const response = await axios.post('https://toyflix.in/api/sendOtp.php', formData.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
      
          console.log("Response received:", response);
      
          if (response.data.success) {
            console.log('OTP sent successfully!');
            setOtpVisible(true);
           
          } else {
            console.error('Error response from server:', response.data);
            Alert.alert('Failed to send OTP:', response.data.phone_number || 'Unknown error.');
          }
  
        } else {
          Alert.alert("Account is already registered with this phone number. Please Login.");
        }
      } else {
        Alert.alert(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error during API request:', error);
      
      // Check for specific error code
      if (error.code === 'auth/too-many-requests') {
        Alert.alert('Too many requests. Please try again after some time.');
      } else {
        Alert.alert('An error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
    
  };
  
  
  const handleVerifyOtp = async () => { 
    console.log("otp", otp);
    console.log("phone", `+91${f1}`);
   
  try {
    // Using FormData with x-www-form-urlencoded format
    const formData = new URLSearchParams();
    formData.append('otp', otp);
    formData.append('phone_number', `+91${f1}`);
    console.log("phone", `+91${f1}`);
    console.log("otp", otp);

    // Making the POST request using axios
    const response = await axios.post('https://toyflix.in/api/verifyOtp.php', formData.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    // Directly access the response data
    const data = response.data;
console.log("response",data.success);
if (data.success === true) {
        Alert.alert('Success', 'Phone number verified successfully.');
        setOtpVisible(false);
        setOtp1(true);
      }
      else{
        console.error("Error verifying OTP:", error);
        alert("An error occurred. Please try again.");
      }
    
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP.');
    }
  };

  const handleRegister = async () => {
    if (!isFormValid) {
      Alert.alert('All fields are required and phone number must be verified.');
      return;
    }
    if (!otp1) {
      handlePhoneVerification();
      return;
    }
    if (!isFormValid) {
      Alert.alert('All fields are required and phone number must be verified.');
      return;
    }
    setLoading(true);
    try {
      // Get the FCM token
      // const fcmToken = await getFcmToken();
  
      const formData = new FormData();
      formData.append('mobile', f1.trim());
      formData.append('username', f2.trim());
      formData.append('email', f3.trim());
      formData.append('pincode', f4.trim());
      // formData.append('fcm_token', fcmToken); // Include the FCM token here
      formData.append('fcm_token', "xnuwnxun"); // Include the FCM token here
      const response = await axios.post(
        'https://toyflix.in/wp-json/api/v1/sign-up/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 15000,
        }
      );
      
      console.log(response.data); // Log the entire response data for debugging
  
      if (response.status === 200 && response.data.status === 200) {
        await AsyncStorage.setItem('token', response.data.token); // Correct property used here
        Alert.alert('Registration successful!');
        navigation.navigate('Intro');
      } else {
        Alert.alert(`${response.data.message || 'Failed to create user.'}`);
        setLoading(true);
      }
    } catch (error) {
      console.error('Error during API request:', error);
      Alert.alert('An error occurred. Please try again later.');
      setLoading(true);
    } finally {
    setLoading(false);
  }
  };
  useEffect(() => {
    // Set a timer to clear form data after 2 minutes (120000 milliseconds)
    const timer = setTimeout(() => {
      setF1('');
      setF2('');
      setF3('');
      setF4('');
      setOtp('');
      setOtp1(false);
      setOtpVisible(false);
      setConfirm(null);
    }, 120000); // 2 minutes
  
    // Clear the timer on component unmount or when the component is re-entered
    return () => clearTimeout(timer);
  }, []); // Empty dependency array ensures this runs once when the component mounts
  

  return (
    
      <View style={styles.container}>
        <ImageBackground
          source={require('../src/111.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <StatusBar backgroundColor='white' barStyle='dark-content' />
          <Animated.View style={{ transform: [{ translateY }] }}>
          <ScrollView showsVerticalScrollIndicator={false} >
         
         
          <View style={{ padding: SCREEN_WIDTH * 0.04,top:SCREEN_HEIGHT*-0.17}}>
            <View style={{ marginTop: SCREEN_HEIGHT * 0.09 }}>
              <Animatable.Image animation="fadeInDown" duration={3000} source={require('../src/RegisterElements/1.png')} style={[styles.image1, { zIndex: 9 }]} />
              <Animatable.Image animation="fadeInLeft" duration={3000} source={require('../src/RegisterElements/2.png')} style={[styles.image2, { zIndex: 20 }]} />
              <Animatable.Image animation="fadeInDown" duration={3000} source={require('../src/RegisterElements/3.png')} style={[styles.image3, { zIndex: 15 }]} />
            </View>
            <View style={{ marginTop: SCREEN_HEIGHT * -0.17 }}>
              <Animatable.Text animation="fadeInUp" duration={3000} style={styles.register}>Sign-up</Animatable.Text>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Phone number</Text>
                <View style={styles.numb}>
                  <View style={styles.countryCodeContainer}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.mobileInput3}
                    placeholder="Mobile number"
                    placeholderTextColor="#FFFFFF"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={f1}
                    onChangeText={setF1}
                  />
                  <TouchableOpacity
                    style={styles.verifyButton1}
                    onPress={handlePhoneVerification}
                  >
                    <Text style={styles.verifyButtonText1}>Verify</Text>
                  </TouchableOpacity>
                </View>
                {!isPhoneValid && f1.length > 0 && <Text style={styles.warning}>Phone number must be 10 digits long.</Text>}
              </View>

              {otpVisible && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Enter OTP</Text>
                  <TextInput
                    style={styles.mobileInput}
                    placeholder="OTP"
                    placeholderTextColor="#FFFFFF"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={handleVerifyOtp}
                  >
                    <Text style={styles.verifyButtonText}>Verify OTP</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.mobileInput2}
                  maxLength={10}
                  keyboardType='default'
                  value={f2}
                  onChangeText={setF2}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.mobileInput2}
                  maxLength={50}
                  keyboardType='email-address'
                  value={f3}
                  onChangeText={setF3}
                />
                
                {!isEmailValid && f3.length > 0 && <Text style={styles.warning}>Please enter a valid email address.</Text>}
              </View>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Pincode</Text>
                <TextInput
                  style={styles.mobileInput2}
                  maxLength={6}
                  keyboardType='phone-pad'
                  value={f4}
                  onChangeText={setF4}
                />
                {!isPincodeValid && f4.length > 0 && <Text style={styles.warning}>Pincode must be 6 digits long.</Text>}
              </View>

              <TouchableOpacity activeOpacity={0.8}
                style={[styles.button, { backgroundColor: isFormValid ? '#F22F47' : '#F22F47' }]}
                onPress={handleRegister}
                // disabled={!isFormValid}
              >
               {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign-up</Text>
              )}
               
              </TouchableOpacity>

              <Text style={styles.footerText}>
                Have an account?
                <Text style={styles.linkText} onPress={() => navigation.navigate('Login')}> Login</Text>
              </Text>
            </View>
          </View>
          
          </ScrollView>
          </Animated.View>
        </ImageBackground>
        
      </View>

  );
};

export default Newuser;

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
    
  },
  backgroundImage: {
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  image1: {
    top: SCREEN_HEIGHT * 0.15,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_HEIGHT * 0.25,
    resizeMode: 'contain',
  },
  image2: {
    alignSelf: 'center',
    top: SCREEN_HEIGHT * 0.02,
    width: SCREEN_WIDTH * 0.20,
    height: SCREEN_HEIGHT * 0.15,
    resizeMode: 'contain',
    left: SCREEN_WIDTH * 0.15,
  },
  image3: {
    alignSelf: 'center',
    width: '100%',
    height: SCREEN_HEIGHT * 0.18,
    top: SCREEN_HEIGHT * -0.20,
    resizeMode: 'contain',
  },
  register: {
    textAlign: 'center',
    fontFamily: 'Little Comet Demo Version',
    fontSize: 42,
    top:SCREEN_HEIGHT*1,
    color: 'red',
    paddingBottom: SCREEN_HEIGHT * 0.01,
    top:SCREEN_HEIGHT * 0.004,
  },
  fieldContainer: {
    marginBottom: SCREEN_HEIGHT * 0.006,
    marginTop: SCREEN_HEIGHT * -0.01,
  },
  label: {
    marginBottom: SCREEN_HEIGHT * 0.011,
    fontFamily: 'Urbanist-Regular',
    fontSize: 16,
    color: 'black',
    marginTop: SCREEN_HEIGHT * 0.011,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SCREEN_WIDTH * 0.012,
    borderRadius: normalize(10),
    color:'black'
  },
  countryCodeContainer: {
    borderWidth: normalize(2),
    borderColor: '#FFFFFF',
    paddingVertical: SCREEN_HEIGHT * 0.0081,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    borderRadius: normalize(10),
    marginRight: SCREEN_WIDTH * 0.03,
    backgroundColor: 'white'
  },
  countryCodeText: {
    color: 'black',
    fontWeight:'bold',
    fontSize: 16,
    alignSelf:'center',
    textAlign:'center'
  },
  mobileInput: {
    
    borderWidth: normalize(3),
    borderColor: '#FFFFFF',
    paddingVertical: SCREEN_HEIGHT *0.006,
    paddingHorizontal: SCREEN_WIDTH * 0.09,
    borderRadius: normalize(10),
    color: 'black',
    fontSize: SCREEN_HEIGHT*0.02,
    backgroundColor: 'white',
    marginRight: SCREEN_WIDTH * -0.015,
    fontWeight: "400",
    ontFamily: 'Urbanist-Regular',
    textAlign:'center',
    color:'black',
    borderWidth:1,
    borderColor:'black'
    
    
  },
  mobileInput2: {
    borderWidth: normalize(2),
    borderColor: '#FFFFFF',
    height: SCREEN_HEIGHT * 0.05,
    borderRadius: normalize(10),
    color: "black",
    fontSize: SCREEN_HEIGHT*0.02,
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    width: "100%",
    fontWeight: "bold",
    backgroundColor: 'white',
    marginLeft: SCREEN_WIDTH * 0.005,
    color:'black',
    color:'black',
    borderWidth:1,
    borderColor:'black'
  },
  button: {
    marginTop: SCREEN_HEIGHT * 0.03,
    paddingVertical: SCREEN_HEIGHT * 0.009,
    paddingHorizontal: SCREEN_WIDTH * 0.2,
    borderRadius: normalize(15),
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: 'white',
    borderWidth: normalize(5),
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 9 },
    shadowOpacity: 0.1,
    justifyContent:'center'
  },
  buttonText: {
    fontFamily: 'Little Comet Demo Version',
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '600',
    top: SCREEN_HEIGHT * 0.005,
  },
  footerText: {
    color: 'black',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Urbanist-Regular',
    marginTop: SCREEN_HEIGHT * 0.02,
    paddingBottom: SCREEN_HEIGHT * 0.04,
  },
  linkText: {
    color: 'red',
    paddingBottom:100
  },
  warning: {
    color: 'red',
    marginTop: SCREEN_HEIGHT * 0.01,
    fontSize: normalize(14),
  },
  verifyButton: {
    backgroundColor: '#0C284B',
    borderRadius: normalize(10),
    padding: SCREEN_WIDTH * 0.02,
    marginLeft: SCREEN_WIDTH * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    left:SCREEN_WIDTH*-0.00,
    top:SCREEN_HEIGHT*0.02,
    
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    
  },
  mobileInput3:{
    
    backgroundColor:"white",
    paddingVertical: SCREEN_HEIGHT * 0.009,
    // borderColor:'black',
    // borderWidth:2,
    borderRadius: normalize(10),
    color: "black",
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    fontWeight: "bold",
    width:"60%",
    color:'black'
  },
  verifyButton1:{
    backgroundColor:'white',
    // backgroundColor: '#0C284B',
      borderRadius: 6,
  //  borderWidth:2,borderColor:'yellow',
   width:'15%',
   justifyContent:'center'
  },
  verifyButtonText1: {
    color: 'red', //white
    fontSize: 16,
    fontWeight: 'bold',
    textAlign:'center'
  },
  numb:{
    flexDirection:'row',
    borderWidth: normalize(2),
    borderColor: '#FFFFFF',
    height: SCREEN_HEIGHT * 0.047,
    borderRadius: 10,
    color: "black",
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    width: "100%",
    fontWeight: "bold",
    backgroundColor: 'white',
    marginLeft: SCREEN_WIDTH * 0.005,
    borderWidth:1,
    borderColor:'black'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: Adds a semi-transparent background
  },
});