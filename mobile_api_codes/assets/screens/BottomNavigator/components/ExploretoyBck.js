import { StyleSheet, Text, View, ImageBackground, Dimensions, StatusBar, TouchableOpacity, Image, TextInput, BackHandler, Platform } from 'react-native';
import React from 'react';
import ExploreApi from '../../../API/ExploreApi';
import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const ExploretoyBck = () => {
    const navigation = useNavigation();

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
        <View style={{ flex: 1 }}>
            <StatusBar backgroundColor='#0D2D54' barStyle='dark-content' />
            
            <ImageBackground 
                style={{ width: '100%', height: '100%' }} 
                source={require('../src/screenbackground.png')} 
                resizeMode="cover"
            >
                <View style={{ marginBottom: 20 }}>
                    <TouchableOpacity 
                        onPress={() => navigation.navigate("Home1")} 
                        style={[styles.backButton, Platform.OS === 'ios' && { top: height * 0.07 }]} // Add platform-specific style
                    >
                        <Image source={require('../src/arrow2.png')} style={styles.Arrow} />
                    </TouchableOpacity>

                    <View style={[styles.searchbox1, Platform.OS === 'ios' && { marginTop: height * 0.08 }]}> 
                        {/* Platform-specific adjustment */}
                        <TextInput
                            style={styles.searchbox}
                            placeholder='Search'
                            placeholderTextColor={"grey"}
                        />
                        <TouchableOpacity>
                            <Image
                                source={require('../src/search.png')}
                                style={{ height: 30, width: 30, right: width * 0.06 }}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ top: height * 0.02 }}>
                    <ExploreApi />
                </View>
            </ImageBackground>
        </View>
    );
}

export default ExploretoyBck;

const styles = StyleSheet.create({
    backButton: {
        position: 'absolute',
        top: height * 0.1,
        left: height * 0.02,
        padding: 10,
        zIndex: 99, 
    },
    Arrow: {
        height: 25,
        width: 35,
        top:height*0.005
    },
    searchbox: {
        width: width * 0.70,
        height: height * 0.05,
        textAlign: 'center',
        alignSelf: 'center',
        borderRadius: width * 0.2,
        left: width * 0.034,
        textAlign: 'center',
        color: "black",
        fontSize: 14,
        fontFamily: 'Quicksand-SemiBold',
        fontWeight: '700',
        alignContent: 'center'
    },
    searchbox1: {
        width: width * 0.7,
        height: height * 0.05,
        marginLeft: width * 0.2,
        borderRadius: width * 0.2,
        marginTop: height * 0.038,
        justifyContent: 'center',
        alignItems: 'center',
        color: "black",
        fontSize: 14,
        fontFamily: 'Quicksand-SemiBold',
        backgroundColor: "white",
        fontWeight: '700',
        flexDirection: 'row',
    },
});
