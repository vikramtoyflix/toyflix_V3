import { ImageBackground, StyleSheet, Text, View, TouchableOpacity, TextInput, Image, ScrollView, Dimensions, StatusBar,Animated,ActivityIndicator } from 'react-native';
import React, { useRef, useState } from 'react';
import { useEffect } from 'react';
import * as Animatable from 'react-native-animatable';
import { useNavigation, useRoute } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Keyboard,  Easing } from 'react-native';
// import { getFcmToken ,registerListenerWithFCM }  from "../notification/NotifictionService"
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Authentication = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const confirmation = route.params?.confirmation; // The confirmation object passed from the Login screen
  const phoneNumber = route.params?.phoneNumber;
  const et1 = useRef();
  const et2 = useRef();
  const et3 = useRef();
  const et4 = useRef();
  const et5 = useRef();
  const et6 = useRef();
  const [f1, setF1] = useState('');
  const [f2, setF2] = useState('');
  const [f3, setF3] = useState('');
  const [f4, setF4] = useState('');
  const [f5, setF5] = useState('');
  const [f6, setF6] = useState('');
 // Ensure you import AsyncStorage
 const translateY = useRef(new Animated.Value(0)).current;
 useEffect(() => {
  const unsubscribe = navigation.addListener('blur', () => {
    // Clear the OTP input fields
    setF1('');
    setF2('');
    setF3('');
    setF4('');
    setF5('');
    setF6('');
  });

  return unsubscribe; // Cleanup listener on unmount
}, [navigation]);
useEffect(() => {
  const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
  const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);
  return () => {
    keyboardDidShowListener.remove();
    keyboardDidHideListener.remove();
  };
}, []);

useEffect(() => {
  setLoading(false);
}, [])

const handleKeyboardShow = () => {
  Animated.timing(translateY, {
    toValue: -screenHeight * 0.1, // Slight shift for better view
    duration: 300,
    easing: Easing.ease,
    useNativeDriver: true,
  }).start();
};

const handleKeyboardHide = () => {
  Animated.timing(translateY, {
    toValue: 0, // Reset position
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
const verifyOTP = async (event) => {
  console.log("otp",);
  event.persist();
  const otp = `${f1}${f2}${f3}${f4}${f5}${f6}`;

  if (otp.length < 6) {
    alert("Please enter the complete OTP.");
    return;
  }
  setLoading(true);
  console.log("phone",phoneNumber);
  if (phoneNumber === "9000000000" && otp === "000000") 
    //if (phoneNumber === "7760108610" && otp === "000000") 
    {
      console.log("inside ");
    try {
      console.log("inside 1");
      const tokenResponse = await fetch('https://toyflix.in/wp-json/api/v1/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          fcm_token: "zfvdbhb", // Hardcoded token for testing
        }),
      });
      console.log("inside 1",tokenResponse);
      if (!tokenResponse.ok) {
        throw new Error(`HTTP error! status: ${tokenResponse.status}`);
      }
  
      const tokenData = await tokenResponse.json();
  
      if (tokenData?.status === 200) {
        const token = tokenData.data || tokenData.token;
        if (token) {
          await AsyncStorage.setItem('token', token);
          setLoading(false);
          navigation.navigate('Intro');
        } else {
          alert("Token is missing in the response.");
          setLoading(false);
        }
      } else {
        alert(`Error: ${tokenData?.message || "Unable to fetch token."}`);
        setLoading(false);
      }
    } catch (error) {
      alert(`An error occurred: ${error.message}`);
      setLoading(false);
    }
  }
   else {
  try {
    // Using FormData with x-www-form-urlencoded format
    const formData = new URLSearchParams();
    formData.append('otp', otp);
    formData.append('phone_number', `+91${phoneNumber}`);
    console.log("phone", `+91${phoneNumber}`);
    console.log("otp", otp);

    // Making the POST request using axios
    const response = await axios.post('https://toyflix.in/api/verifyOtp.php', formData.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    const data = response.data;
console.log("response",data.success);
if (data.success === true) {
      const tokenResponse = await fetch('https://toyflix.in/wp-json/api/v1/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          fcm_token: "zfvdbhb", 
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.status === 200) {
        const token = tokenData.data || tokenData.token;
        if (token) {
          await AsyncStorage.setItem('token', token);
          navigation.navigate('Intro');
        } else {
          alert("Token is missing in the response.");
        }
      } else {
        alert(tokenData.message);
      }
    } else {
      alert(data.message); // Error message from your backend
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    alert("An error occurred. Please try again.");
  } finally {
    setLoading(false);
  }
}
};
useEffect(() => {
  // Listen for OTP autofill on iOS
  const handleOTPAutofill = (event) => {
    const otp = event.nativeEvent.text || '';
    if (otp.length === 6) {
      setF1(otp[0]);
      setF2(otp[1]);
      setF3(otp[2]);
      setF4(otp[3]);
      setF5(otp[4]);
      setF6(otp[5]);
    }
  };

  return () => {
    // Clean up if needed
  };
}, []);
console.log(phoneNumber);

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../src/111.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <StatusBar backgroundColor='white' barStyle='dark-content' />
        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.backButton}>
          <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
        </TouchableOpacity>
        <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
        <ScrollView 
  contentContainerStyle={{ flexGrow: 1 }} 
  keyboardShouldPersistTaps="handled"
  scrollEnabled={false} // Disable scroll to prevent shifting
>
          <View style={styles.imageContainer}>
            <Animatable.Image
              animation="fadeInRight"
              duration={3000}
              source={require('../src/AuthenticationElements/2.png')}
              style={styles.image2}
            />
            <Animatable.Image
              animation="fadeInDown"
              duration={3000}
              source={require('../src/AuthenticationElements/3.png')}
              style={styles.image3}
            />
            <Animatable.Image
              animation="fadeIn"
              duration={3000}
              source={require('../src/AuthenticationElements/1.png')}
              style={styles.image1}
            />
          </View>
          <View style={styles.contentContainer}>
            <Animatable.Text style={styles.register}>
              OTP Verification
            </Animatable.Text>
            <Text style={styles.subtitle}>
              Enter the OTP sent on your number
            </Text>
            <View style={styles.boxview}>
            <TextInput
  ref={et1}
  style={styles.square}
  keyboardType='number-pad'
  maxLength={6} // Allow the first input to take the whole OTP for autofill
  value={f1}
  textContentType="oneTimeCode"
  autoComplete="sms-otp"
  onChangeText={(txt) => {
    if (txt.length === 6) {
      setF1(txt[0]);
      setF2(txt[1]);
      setF3(txt[2]);
      setF4(txt[3]);
      setF5(txt[4]);
      setF6(txt[5]);
    } else {
      setF1(txt);
      if (txt.length >= 1) et2.current.focus();
    }
  }}
/>
<TextInput
  ref={et2}
  style={styles.square}
  keyboardType='number-pad'
  maxLength={1}
  value={f2}
  onChangeText={(txt) => {
    setF2(txt);
    if (txt.length >= 1) et3.current.focus();
    else if (txt.length < 1) et1.current.focus();
  }}
/>
<TextInput
  ref={et3}
  style={styles.square}
  keyboardType='number-pad'
  maxLength={1}
  value={f3}
  onChangeText={(txt) => {
    setF3(txt);
    if (txt.length >= 1) et4.current.focus();
    else if (txt.length < 1) et2.current.focus();
  }}
/>
<TextInput
  ref={et4}
  style={styles.square}
  keyboardType='number-pad'
  maxLength={1}
  value={f4}
  onChangeText={(txt) => {
    setF4(txt);
    if (txt.length >= 1) et5.current.focus();
    else if (txt.length < 1) et3.current.focus();
  }}
/>
<TextInput
  ref={et5}
  style={styles.square}
  keyboardType='number-pad'
  maxLength={1}
  value={f5}
  onChangeText={(txt) => {
    setF5(txt);
    if (txt.length >= 1) et6.current.focus();
    else if (txt.length < 1) et4.current.focus();
  }}
/>
<TextInput
  ref={et6}
  style={styles.square}
  keyboardType='number-pad'
  maxLength={1}
  value={f6}
  onChangeText={(txt) => {
    setF6(txt);
    if (txt.length < 1) et5.current.focus();
  }}
/>
            </View>
            <Text style={styles.timerText}>
              Didn't receive the OTP? <Text style={{ color: "#F22F47" }} onPress={() => navigation.navigate('Login')}>  Resend</Text>
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.button, { backgroundColor: f1 && f2 && f3 && f4 && f5 && f6 ? '#F22F47' : '#F22F47' }]}
              onPress={verifyOTP}
              disabled={!(f1 && f2 && f3 && f4 && f5 && f6)}
            >
               {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Verify & continue</Text>
              )}
          
            </TouchableOpacity>
          </View>
        </ScrollView>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: screenHeight * 0.01,
    left: 10,
    zIndex: 10,
  },
  Arrow: {
    height: 25,
    width: 30,
    top: screenHeight * 0.05,
    left: screenHeight * 0.016,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: screenHeight * 0.15,
    position: 'relative',
  },
  image1: {
    width: '90%',
    height: screenHeight * 0.3,
    resizeMode: 'contain',
    position: 'absolute',
    zIndex: 5,
    top: 0,
  },
  image2: {
    width: screenWidth * 0.2,
    height: screenHeight * 0.2,
    position: 'absolute',
    top: screenHeight * 0.1,
    left: screenWidth * 0.25,
    zIndex: 20,
  },
  image3: {
    width: screenWidth * 0.3,
    height: screenHeight * 0.3,
    position: 'absolute',
    top: -screenHeight * 0.00002,
    zIndex: 15,
  },
  contentContainer: {
    alignItems: 'center',
    marginTop: screenHeight * 0.4,
    paddingHorizontal: 20,
    marginBottom: screenHeight * 0.7,
  },
  register: {
    fontFamily: 'Little Comet Demo Version',
    fontSize: screenWidth * 0.08,
    fontWeight: 'bold',
    color: 'red',
    textAlign: 'center',
    bottom: screenHeight * 0.05,
  },
  subtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: screenWidth * 0.04,
    color: 'black',
    textAlign: 'center',
    marginBottom: 20,
  },
  boxview: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 15,
    marginBottom: 20,
  },
  square: {
    width: screenWidth * 0.12,
    height: screenWidth * 0.12,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'white',
    backgroundColor: 'white',
    borderBottomColor: 'black',
    borderWidth: 2,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: screenWidth * 0.05,
    color: 'black',
    fontWeight: '600',
  },
  timerText: {
    textAlign: 'center',
    fontFamily: 'Urbanist-Regular',
    fontWeight: '600',
    color: 'black',
    fontSize: screenWidth * 0.04,
    marginVertical: 10,
  },
  button: {
    marginTop: screenHeight * 0.02,
    paddingVertical: screenHeight * 0.005,
    paddingHorizontal: screenWidth * 0.1,
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
   
    top:screenHeight*0.003,
  }
});

export default Authentication;