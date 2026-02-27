import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, TextInput, ScrollView,Animated, Dimensions, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator,Alert } from 'react-native';
import React, { useEffect, useState ,useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keyboard,  Easing } from 'react-native';
const { width, height } = Dimensions.get('window');

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const [isFocused, setIsFocused] = useState(false);
  const [inputVisible, setInputVisible] = useState(false); 
  const translateY = useRef(new Animated.Value(0)).current;
  const validatePhoneNumber = (number) => {
    const phoneNumberPattern = /^[0-9]{10}$/;
    return phoneNumberPattern.test(number);
  };
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
      toValue: -80,
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
  const handleFocus = () => {
    setInputVisible(true);
  };
  const handleBlur = () => {
    if (phoneNumber.length === 0) {
      setInputVisible(false);
    }
  };


  const sendOtpWithTwilio = async () => {
    console.log("Payload:", { phone_number: `+91${phoneNumber}` });
  
    if (!phoneNumber || phoneNumber.trim() === '') {
      Alert.alert('Phone number is required.');
      return;
    }
  
    setLoading(true);
    try {
      console.log("Sending OTP...");
  
      // Use FormData with x-www-form-urlencoded format
      const formData = new URLSearchParams();
      formData.append('phone_number', `+91${phoneNumber}`);
  
      const response = await axios.post('https://toyflix.in/api/sendOtp.php', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
  
      console.log("Response received:", response);
  
      if (response.data.success) {
        console.log('OTP sent successfully!');
        navigation.navigate('Authentication',{phoneNumber});
      } else {
        console.error('Error response from server:', response.data);
        Alert.alert('Failed to send OTP:', response.data.phone_number || 'Unknown error.');
      }
    } catch (error) {
      console.error('Error during OTP request:', error);
      Alert.alert('Error sending OTP:', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };
  const handlePhoneNumberChange = (text) => {
    setPhoneNumber(text);
    setIsValid(validatePhoneNumber(text));
  };
  const signInWithPhoneNumber = async () => {
    if (!isValid) {
      Alert.alert('Please enter a valid phone number.');
      return;
  }
    setLoading(true);  // Start loading  
    try {
      const headers = {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      };
      const formData = new FormData();
      formData.append('phone', phoneNumber.trim());

      const response = await axios.post(
        'https://toyflix.in/wp-json/api/v1/check-phone-exists/',
        formData,
        { headers, timeout: 15000 }
      );
      console.log(response.data.user_token);
      console.log(response.status);
      if (response.status === 200) {
        if (response.data.status === 200) {
          // navigation.navigate('Authentication',{phoneNumber});
          // await AsyncStorage.setItem('token', response.data.user_token); 7760108610
          // console.log(response.data.user_token);
        // const confirmation = await auth().signInWithPhoneNumber('+91' + phoneNumber);
        // await AsyncStorage.setItem('verificationId', confirmation.verificationId);
        // navigation.navigate('Authentication', { phoneNumber: phoneNumber.trim() });
        sendOtpWithTwilio();
        } else{
          Alert.alert(
          "No account is registered with this phone number.", // Title
          "", // Message
          [
            {
              text: "Sign-in",
              onPress: () => navigation.navigate('Newuser') // Replace 'Newuser' with your actual screen name
            }
          ]
        );
      }   
      } else {
        Alert.alert(`Unexpected response status: ${response.status}`);
      }
    }catch (error) {
      console.error('Check your Network');
      // Check for specific error code in the error message
      if (error.message && error.message.includes('[auth/too-many-requests]')) {
        Alert.alert('Too many requests. Please try again after some time.');
      } else if (error.response) {
        Alert.alert('Something went wrong. Please check your phone number and try again.');
      } else if (error.request) {
        Alert.alert('No response from the server. Please check your network connection and try again.');
      } else {
        Alert.alert('An error occurred. Please try again later.');
      }
    }
     finally {
      setLoading(false); // Stop loading
    }
  };
  useEffect(() => {
    // Clear phone number input after 2 minutes (120000 milliseconds)
    const timeoutId = setTimeout(() => {
      setPhoneNumber('');
      setIsValid(false);
    }, 120000);
  
    return () => {
      clearTimeout(timeoutId); // Clear the timeout if the component unmounts or if useEffect is called again
    };
  }, []);
  useEffect(() => {
    const clearInputOnMount = async () => {
      const storedPhoneNumber = await AsyncStorage.getItem('phoneNumber'); // Fetch from AsyncStorage if needed
      if (storedPhoneNumber) {
        setPhoneNumber(storedPhoneNumber);
      } else {
        setPhoneNumber(''); // Clear if not found
      }
    };
  
    clearInputOnMount();
  }, []);
  return (
      <ImageBackground source={require('../src/111.png')} style={styles.background} resizeMode="cover">
        <View style={styles.container}>
        <StatusBar backgroundColor='white' barStyle='dark-content' />
        <ScrollView contentContainerStyle={styles.scrollViewContainer} showsVerticalScrollIndicator={false} >
        <Animated.View style={{ transform: [{ translateY }] }}>
        <View style={{top:height*-0.1}}>
            <Animatable.Image animation="fadeInRight" duration={3000} source={require('../src/LoginElements/2.png')} style={[styles.image2, { zIndex: 15 }]} />
            <Animatable.Image animation="fadeInDown" duration={3000} source={require('../src/LoginElements/3.png')} style={[styles.image3, { zIndex: 10 }]} />
            <Animatable.Image animation="fadeIn" duration={3000} source={require('../src/LoginElements/1.png')} style={[styles.image, { zIndex: 5 }]} />
            </View>
            <View style={{top:height*-0.2}}>
          <Text style={styles.text}>Login</Text>
          <View style={styles.bottombox}>
            <Text style={styles.label}>Country code</Text>
            <View style={styles.container1}>
              <View style={styles.countryCodeContainer}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
      <TextInput
        value={phoneNumber}
        onChangeText={handlePhoneNumberChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={styles.mobileInput}
        placeholder="Mobile number"
        placeholderTextColor="#FFFFFF"
        keyboardType="phone-pad"
        maxLength={10}
      />
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.button, { backgroundColor: isValid ? '#F22F47' : '#F22F47' }]}
              onPress={signInWithPhoneNumber}
              // onPress={()=>navigation.navigate("Intro")}
              disabled={loading} // Disable button while loading
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Login with OTP</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.footerText}>
              No account yet? <Text style={styles.linkText} onPress={() => navigation.navigate('Newuser')}>Create an account</Text>
            </Text>
            </View>
            </View>
            </Animated.View>
        </ScrollView>
    </View>
    </ImageBackground>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollViewContainer: {
    paddingHorizontal: width * 0.05, // Consistent horizontal padding
  },
  headerContainer: {
    alignItems: 'center',
    
    top: height * 0.1,
   
  },
  text: {
    fontSize: 42,
    color: 'red',
    fontFamily: 'Little Comet Demo Version',
    top: height * -0.14,
    textAlign: 'center',
  },
  image: {
    marginLeft: 30,
    width: width * 2.5,
    height: height * 0.30,
    resizeMode: 'contain',
    alignSelf: 'center',
    top: height * -0.25, 
  },
  image2: {
    marginLeft: 30,
    width: width * 0.16,
    height: height * 0.26,
    top: height * 0.34,
    left: width * 0.1,
    resizeMode: 'contain',
    alignSelf: 'center',  
  },
  image3: {
    alignSelf: 'center',
    width: width * 0.3,
    height: height * 0.3,
    top: height * 0.066,
    resizeMode: 'contain',
  },
  label: {
    color: 'black',
    fontFamily: 'Urbanist-Regular',
    marginLeft: 20,
    fontSize: 16,
    marginTop: height * -0.1,
    marginBottom: height * 0.02,
    left: width*-0.05,
  },
  button: {
    marginTop: height * 0.03,
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
    zIndex: 999,
  },
  buttonText: {
    fontFamily: 'Little Comet Demo Version',
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '600',
    marginTop: 3,
  },
  footerText: {
    color: 'black',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Urbanist-Regular',
    marginTop: height * 0.05,
    paddingBottom: height * 0.01,
    fontWeight: '600',
  },
  linkText: {
    color: 'red',
  },
  bottombox: {
    marginBottom: height * 0.1, // Adjusted for bottom spacing
  },
  countryCodeContainer: {
    borderWidth: 0,
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.1,
    borderRadius: 10,
    paddingLeft: 5,
    marginRight: 10,
    justifyContent: 'flex-end',
    backgroundColor: 'white',
    textAlign: 'center',
  },
  countryCodeText: {
    color: 'black',
    fontSize: 18,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '700',
    left: 13,
  },
  mobileInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    width:"180%",
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'white',
    color: 'white',
    fontSize: 18,
    fontFamily: 'Urbanist-Regular',
    color:"black"
  },
  container1: {
    flexDirection: 'row',
    marginBottom: height * 0.05, // Space between input and button
  },
});

export default Login;
