import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions, StatusBar, BackHandler } from 'react-native';
import React, { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import {  useRoute } from '@react-navigation/native';
const { width, height } = Dimensions.get('window');

const HowSelectToy = () => {
    const navigation = useNavigation();
    const route = useRoute(); // Access the route object to get params (memberId)
    const memberId = route.params?.memberId; // Get memberId if available
    const up = route.params?.up; // Get memberId if available

    console.log("helwwwwwww 2",up);
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                navigation.navigate('Home1');
                return true; // Prevents the default back button behavior
            };
    
            BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => {
                BackHandler.removeEventListener('hardwareBackPress', onBackPress);
            };
        }, [navigation])
    );
    return (
        <View style={styles.container}>
            <StatusBar backgroundColor='white' barStyle='dark-content' />
            <Image
                source={require('../src/select5.png')}
                style={styles.introImage}
            />
            <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('TestLinking', { memberId , up:up })}>
    <Text animation="zoomIn" duration={2000} style={styles.buttonText}>
        Understood
    </Text>
</TouchableOpacity>

            </View>
        </View>
    );
}

export default HowSelectToy;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'center', // Center contents vertically
        alignItems: 'center',     // Center contents horizontally
    },
    introImage: {
        width: width *2, // Set width as a percentage of screen size
        height: height * 1.2, // Set height as a percentage of screen size
        resizeMode: 'contain', // Ensures image maintains its aspect ratio
        position: 'absolute',
        top: height * -0.06, // Adjusted position
    },
    buttonContainer: {
        position: 'absolute',
        bottom: height * 0.1, // Position button at the bottom of the screen
        alignItems: 'center',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        backgroundColor: '#112D51',
        borderRadius: 15,
        alignItems: 'center',
        borderColor: '#F3C853',
        borderWidth: 5,
        shadowColor: 'black',
        shadowOffset: { width: 2, height: 9 },
        shadowOpacity: 0.1,
        top: height * 0.04,
    },
    buttonText: {
        fontFamily: 'Little Comet Demo Version',
        color: '#ffffff',
        fontSize: 24, // Adjusted font size for better fit
        fontWeight: '600',
    },
});
