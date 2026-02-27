import { StyleSheet, Text, View, Dimensions, ImageBackground, TouchableOpacity, Image, StatusBar, BackHandler, ScrollView } from 'react-native';
import React, { useState,useEffect } from 'react';
import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useMember } from '../../../API/MemberContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const parent_id = 0;
const { width, height } = Dimensions.get('window');

const WithoutMemb = () => {
    const navigation = useNavigation();
    // const { setMemberId } = useMember();
    const [userName, setUserName] = useState('');
    const [hasTrialPlan, setHasTrialPlan] = useState(false); // State to check if user has a trial plan
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isTokenAvailable, setIsTokenAvailable] = useState(false);


    return (
        <View style={{ flex: 1 }}>
            <StatusBar style={{ backgroundColor: '#FFFFFF' }} barStyle='dark-content' />
            <ImageBackground
                style={{ flex: 1 }}
                source={require('../../../src/111.png')}
                resizeMode="cover"
            >
              
                <View style={styles.topbar}>
          
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ zIndex: 10 }}>
                        <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
                    </TouchableOpacity>
                
                    <Text style={styles.topheading}>Choose Membership</Text>
                </View>
 
                <View style={{ top: height * 0 }}>
                    <ScrollView contentContainerStyle={{ padding: 10 }} horizontal={true} style={{ height: "100%" }} showsHorizontalScrollIndicator={false}>
                        {/* Conditionally render Image 222 based on hasTrialPlan   onPress={() => handleNavigation(7826)}*/}
                        {/* {hasTrialPlan == false && ( */}
                            <View style={styles.imageContainer}>
                                <Image source={require('../../../src/222.png')} style={styles.image} />
                                <TouchableOpacity style={styles.button} 
                                    onPress={() => navigation.navigate('Login')
                                      }>
                                    <Text style={styles.buttonText}>Continue</Text>
                                </TouchableOpacity>
                            </View>
                        {/* )} */}

                        {/* Image 2 */}
                        <View style={styles.imageContainer}>
                            <Image source={require('../../../src/333.png')} style={styles.image} />
                            <TouchableOpacity style={styles.button} 
                                onPress={() => navigation.navigate('Login')
                                  }>
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Image 3 */}
                        <View style={styles.imageContainer}>
                            <Image source={require('../../../src/444.png')} style={styles.image} />
                            <TouchableOpacity style={styles.button} 
                          onPress={() => navigation.navigate('Login')}>
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

export default WithoutMemb;

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
