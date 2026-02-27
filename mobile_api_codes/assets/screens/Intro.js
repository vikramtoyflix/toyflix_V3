import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions,StatusBar } from 'react-native'
import React from 'react';
import  { useState, useEffect,useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

const Intro = () => {
    const navigation = useNavigation();
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
    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
             <StatusBar backgroundColor='white' barStyle='dark-content' />
            <Image
                source={require('../src/intro1.png')}
                style={[styles.introImage, { width: width * 0.8, height: height * 1.00,top:height*0.01}]} // Set width and height as a percentage of screen size
            />
            <View style={{ zIndex: -1, marginTop: -height * 0.15 }}>
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('BottomNavigator')}>
                    <Text animation="zoomIn" duration={2000} style={styles.buttonText}>
                        Understood
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default Intro

const styles = StyleSheet.create({
    introImage: {
        alignSelf: 'center',
        marginTop:height*0.03,
        zIndex: -10,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        // paddingHorizontal: 85,
        backgroundColor: '#112D51',
        borderRadius: 15,
        alignItems: 'center',
        alignSelf: 'center',
        borderColor: '#F3C853',
        borderWidth: 5,
        shadowColor: 'black',
        shadowOffset: { width: 2, height: 9 },
        shadowOpacity: 0.1,
        justifyContent:'center',
        width:"50%",
        marginTop: -4,
    },
    buttonText: {
        fontFamily: 'Little Comet Demo Version',
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
        marginTop: 5,
    },
});