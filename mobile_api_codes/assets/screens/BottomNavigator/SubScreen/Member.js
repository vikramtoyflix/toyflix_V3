import { StyleSheet, Text, View, Dimensions, ImageBackground, TouchableOpacity, Image, StatusBar, BackHandler, ScrollView } from 'react-native';
import React, { useState,useEffect } from 'react';
import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useMember } from '../../../API/MemberContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const { width, height } = Dimensions.get('window');

const Member = () => {
    const navigation = useNavigation();
    // const { setMemberId } = useMember();
    const [userName, setUserName] = useState('');
    const [hasTrialPlan, setHasTrialPlan] = useState(false); // State to check if user has a trial plan
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isTokenAvailable, setIsTokenAvailable] = useState(false);
    const [navigateNow, setNavigateNow] = useState(false);
    const [navParams, setNavParams] = useState(null);
    const [up, setup] = useState('');
    useFocusEffect(
        React.useCallback(() => {
          const checkToken = async () => {
            try {
              console.log('Checking token...');
              const token = await AsyncStorage.getItem('token');
              if (token) {
                console.log('Token found:', token);
                setIsTokenAvailable(true);
              } else {
                console.log('Token not found');
                setIsTokenAvailable(false);
              }
            } catch (err) {
              console.error('Error retrieving token:', err);
              setError('Failed to fetch token');
              setIsTokenAvailable(false);
            } finally {
              setLoading(false); // Once AsyncStorage is checked, we stop the loading state
            }
          };
      
          checkToken(); // Call the async function
      
          // Cleanup function (if needed)
          return () => {
            setLoading(true); // Optionally reset loading state when screen loses focus
          };
        }, []) // Empty dependency array ensures this effect only runs once
      );
      // Log token availability and loading state for debugging
      useEffect(() => {
        console.log('Loading:', loading);
        console.log('Token available:', isTokenAvailable);
        if (error) {
          console.log('Error:', error);
        }
      }, [isTokenAvailable]);




    useFocusEffect(
        useCallback(() => {
            const fetchUserName = async () => {
                try {
                    setLoading(true); // Set loading to true
                    const token = await AsyncStorage.getItem('token'); // Fetch the token from AsyncStorage

                    if (!token) {
                        throw new Error('Token not found'); // Throw error if no token
                    }

                    console.log('Token:', token); // Log the token for debugging

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

                    console.log('API Response:', response.data); // Log the API response for debugging

                    if (response.data && response.data.status === 200) {
                        const userNameFromAPI = response.data.data.username; // Extract username
                        const membershipDetails = response.data.data.subscription_details[0]; 
                        setUserName(userNameFromAPI); // Set the retrieved username to state
                        setHasTrialPlan(response.data.data.has_used_trial); // Check if the user has a trial plan
                    } else {
                        throw new Error('Unexpected response format'); // Handle unexpected format
                    }
                } catch (err) {
                    if (err.response) {
                        console.log('API Response Error:', err.response.data); // Log the response error data
                        
                    } else {
                        console.log('Error fetching username:', err); // Log general error
                      
                    }
                } finally {
                    setLoading(false); // Set loading to false
                }
            };

            fetchUserName(); // Call the fetch function

            return () => {
                // Optional cleanup if needed
            };
        }, []) // The useCallback dependencies, if any, can be included here
    );




    // Handler for navigating with ID
    const handleNavigation = (id) => {
        setup(1);
        setNavParams({ id }); // Store navigation params temporarily
        setNavigateNow(true);
    };
    
    useEffect(() => {
        if (navigateNow && up !== null) {
            console.log("Updated up:", up);
            console.log("memberId:", navParams.id);
            const parent_id = 0;
            if (navParams.id === 7827) {

                navigation.navigate('Categories', { termId:0, memberId: navParams.id, up });
            } else {
                navigation.navigate('HowSelectToy', { memberId: navParams.id, up });
            }
    
            setNavigateNow(false); // Reset
        }
    }, [up, navigateNow]);


    return (
        <View style={{ flex: 1 }}>
            <StatusBar style={{ backgroundColor: '#FFFFFF' }} barStyle='dark-content' />
            <ImageBackground
                style={{ flex: 1 }}
                source={require('../../../src/111.png')}
                resizeMode="cover"
            >
              
                <View style={styles.topbar}>
                {isTokenAvailable &&(
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ zIndex: 10 }}>
                        <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
                    </TouchableOpacity>
                       )}
                    <Text style={styles.topheading}>Choose Membership</Text>
                </View>
 
                <View style={{ top: height * 0 }}>
                    <ScrollView contentContainerStyle={{ padding: 10 }} horizontal={true} style={{ height: "100%" }} showsHorizontalScrollIndicator={false}>
                        {/* Conditionally render Image 222 based on hasTrialPlan   onPress={() => handleNavigation(7826)}*/}
                        {/* {hasTrialPlan == false && ( */}
                            <View style={styles.imageContainer}>
                                <Image source={require('../../../src/222.png')} style={styles.image} />
                                <TouchableOpacity style={styles.button} 
                                    onPress={() =>
                                        isTokenAvailable
                                          ? handleNavigation(8822)
                                          : navigation.navigate('Login')
                                      }>
                                    <Text style={styles.buttonText}>Continue</Text>
                                </TouchableOpacity>
                            </View>
                        {/* )} */}

                        {/* Image 2 */}
                        <View style={styles.imageContainer}>
                            <Image source={require('../../../src/333.png')} style={styles.image} />
                            <TouchableOpacity style={styles.button} 
                                onPress={() =>
                                    isTokenAvailable
                                      ? handleNavigation(7826)
                                      : navigation.navigate('Login')
                                  }>
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Image 3 */}
                        <View style={styles.imageContainer}>
                            <Image source={require('../../../src/444.png')} style={styles.image} />
                            <TouchableOpacity style={styles.button} 
                                onPress={() =>
                                    isTokenAvailable
                                      ? handleNavigation(7827)
                                      : navigation.navigate('Login')
                                  }>
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Image 4 */}
                        {/* <View style={styles.imageContainer}>
                            <Image source={require('../../../src/444.png')} style={styles.image} />
                            <TouchableOpacity style={styles.button} onPress={() => handleNavigation(17801)}>
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                        </View> */}
                    </ScrollView>
                </View>
            </ImageBackground>
        </View>
    );
};

export default Member;

const styles = StyleSheet.create({
    imageContainer: {
        marginBottom: height * -0.1,
        alignItems: 'center',
    },
    image: {
        width: width * 0.8, // Make the width 95% of the screen width
        height: height * 0.74, // Make the height 85% of the screen height
        resizeMode: 'cover', // You can use 'cover' to fill the area, but it might crop the image
        borderRadius: 15,
        alignSelf: 'center', // Center the image
    },
    button: {
        marginTop: height * 0.01,
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.1,
        borderRadius: 15,
        alignItems: 'center',
        backgroundColor: '#F22F47',
        borderColor: 'white',
        borderWidth: 5,
        shadowColor: 'black',
        shadowOffset: { width: 2, height: 9 },
        shadowOpacity: 0.1,
        alignSelf: 'center',
        top: height * -0
    },
    buttonText: {
        fontFamily: 'Little Comet Demo Version',
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
    },
    topbar: {
        height: height * 0.12,
        backgroundColor: 'white',
        justifyContent: 'center',
    },
    topheading: {
        fontFamily: 'Little Comet Demo Version',
        fontWeight: '600',
        fontSize: width * 0.07,
        color: '#0D2D54',
        textAlign: 'center',
        top: height * 0.02,
        left: height * 0,
    },
    Arrow: {
        height: 20,
        width: 30,
        top: height * 0.047,
        left: width * 0.04,
        zIndex: 9,
    },
});
