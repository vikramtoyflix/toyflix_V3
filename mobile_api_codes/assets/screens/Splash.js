import { ImageBackground, StyleSheet, Text, View, Dimensions, StatusBar } from 'react-native'; 
import React, { useEffect } from 'react';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Helper function to validate token with API
const validateToken = async (token) => {
  try {
    const response = await axios.get(
      'https://toyflix.in/wp-json/api/v1/user-profile/', // Replace with your user profile endpoint
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        params: {
          token: token, // Send the token as a query parameter
        },
      }
    );

    console.log('API Response:', response.data); // Log for debugging
    return response.data.status === 200; // Returns true if token is valid
  } catch (error) {
    console.error('Token validation failed', error);
    return false; // Return false if token is invalid or an error occurs
  }
};

const Splash = ({ navigation }) => {
  useEffect(() => {
    const checkLoginState = async () => {
      try {
        const token = await AsyncStorage.getItem('token'); // Fetch stored token
        console.log("heeeelooooo",token);
        if (token) {
          const isValid = await validateToken(token); // Validate token
          
          if (isValid) {
            navigation.replace("BottomNavigator"); // Navigate to Home1 if token is valid
          } else {
            navigation.replace("Onboard"); // Navigate to Onboard if token is invalid
          }
        } else {
          navigation.replace("Onboard"); // Navigate to Onboard if no token is found
        }
      } catch (e) {
        console.error('Failed to load token', e);
        navigation.replace("Onboard"); // Navigate to Onboard on error
      }
    };

    const timer = setTimeout(() => {
      checkLoginState(); // Check login state after splash duration
    }, 4000); // 4000 milliseconds = 4 seconds

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, [navigation]);

  const { width, height } = Dimensions.get('window');

  return (
    
    <View style={styles.container}>
      <ImageBackground
        source={require('../src/111.png')}
        style={styles.backgroundImage}
      >
        <StatusBar backgroundColor='#174C8F' barStyle='dark-content' />
        <View style={[styles.logoContainer, { top: height * 0.35}]}>
          <Animatable.Image
            animation="zoomIn"
            duration={2000}
            source={require('../src/LogoSplash.png')}
            style={[styles.logo, { width: width * 0.7, height: height * 0.35}]}
          />
        </View>
        <View style={[styles.elementsContainer, { top: -height * 0.12 }]}>
          {/* <Animatable.Image
            animation="slideInDown"
            duration={4000}
            source={require('../src/SplashElements.png')}
            style={[styles.elements, { width: width*2, height: height * 1.22}]}
          /> */}
        </View>
      </ImageBackground>
    </View>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    alignSelf: 'center',
    position: 'absolute',
  },
  logo: {
    resizeMode: 'contain',
  },
  elementsContainer: {
    position: 'absolute',
    
  },
  elements: {
    resizeMode: 'contain',
  },
});