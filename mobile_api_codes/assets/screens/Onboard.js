import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, ImageBackground, Image, Text, TouchableOpacity, Animated, Dimensions, BackHandler, Alert } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Dots = ({ selected }) => {
  return (
    <Animatable.View
      style={{
        width: screenWidth * 0.03,
        height: screenWidth * 0.03,
        marginHorizontal: screenWidth * 0.02,
        backgroundColor: selected ? '#F22F47' : '#FFC107',
        borderRadius: screenWidth * 0.015,
        marginBottom: screenHeight * 0.1,
        marginTop: -screenHeight * 0.1,
      }}
      animation={selected ? "bounceIn" : "fadeIn"}
      duration={800}
    />
  );
};

const Button = ({ text, ...props }) => (
  <Animatable.View animation="zoomIn" duration={600}>
    <TouchableOpacity style={styles.buttonStyle} {...props}>
      <Text style={styles.buttonText}>{text}</Text>
    </TouchableOpacity>
  </Animatable.View>
);

const Skip = (props) => <Button text="Guest" {...props} />;
const Next = (props) => <Button text="Next" {...props} />;
const Done = (props) => <Button text="Done" {...props} />;

const Onboard = () => {
  const navigation = useNavigation();
  const carPosition = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
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
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove(); // Cleanup on unmount
  }, []);

  useEffect(() => {
    const animateCar = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(carPosition, {
            toValue: screenWidth,
            duration: 5000, 
            useNativeDriver: true,
          }),
          Animated.timing(carPosition, {
            toValue: -150, 
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateCar();
  }, [carPosition]);

  return (
    <View style={styles.container}>
      {/* <ImageBackground
        source={require('../src/111.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      > */}
        {/* <Image
          source={require('../src/ROAD.png')} 
          style={styles.road}
        />
        <Animated.Image 
          source={require('../src/CAR.png')} 
          style={[styles.carAnimation, { transform: [{ translateX: carPosition }] }]}
        /> */}
        <Onboarding
     onSkip={() => {
      AsyncStorage.multiRemove(['token', 'refreshToken'])
          .then(() => navigation.navigate('BottomNavigator'))
          .catch(error => console.error('Error clearing AsyncStorage:', error));
  }}
  
          onDone={() => navigation.navigate('Login')}
          DotComponent={Dots}
          SkipButtonComponent={Skip}
          NextButtonComponent={Next}
          DoneButtonComponent={Done}
          bottomBarHighlight={false}
          titleStyles={styles.titleStyle} 
          subTitleStyles={styles.subtitleStyle} 
          bottomBarHeight={screenHeight * 0.2} 
          pages={[
            {
              backgroundColor: 'transparent',
              image: (
                <Image
                style={styles.imageStyle}
                source={require('../src/gif/33.gif')} // Make sure your GIF file is named .gif
                resizeMode="contain" // Optional: Adjusts how the image is resized
            />
              ),
              title: "Easy Subscription",
              subtitle: (
                <Animatable.Text
                  animation="fadeInUp"
                  duration={5000}
                  style={styles.subtitleStyle}
                >
                  Toys that are brought back are sanitized, damage-repaired (if any) and delivered to ensure the safety of the kids.
                </Animatable.Text>
              ),
            },
            {
              backgroundColor: 'transparent',
              image: (
                <Image 
                  source={require('../src/gif/55.gif')} 
                  style={styles.imageStyle}
                />
              ),
              title: "Refreshing Toys",
              subtitle: (
                <Animatable.Text
                  animation="fadeInUp"
                  duration={5000}
                  style={styles.subtitleStyle}
                >
                  Choose the preferred toy collection for your kids, keep them out of boredom.
                </Animatable.Text>
              ),
            },
            {
              backgroundColor: 'transparent',
              image: (
                <Animatable.Image 
                  source={require('../src/gif/11.gif')} 
                  style={styles.imageStyle}
                  animation="fadeIn" 
                />
              ),
              title: "Safe & Damage free",
              subtitle: (
                <Animatable.Text
                  animation="fadeInUp"
                  duration={5000}
                  style={styles.subtitleStyle}
                >
                  Toys that are brought back are sanitized, damage-repaired (if any) and delivered to ensure the safety of the kids.
                </Animatable.Text>
              ),
            },
            {
              backgroundColor: 'transparent',
              image: (
                <Animatable.Image 
                  source={require('../src/gif/22.gif')} 
                  style={styles.imageStyle}
                  animation="fadeIn"
                />
              ),
              title:"Love & Adventure",
              subtitle: (
                <Animatable.Text
                  animation="fadeInUp"
                  duration={5000}
                  style={styles.subtitleStyle}
                >
                  We just don’t rent toys but we deliver a bundle of joy, adventure for kids. Explore our collection of premium toys. Come join us..!
                </Animatable.Text>
              ),
            },
          ]}
        />
      {/* </ImageBackground> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:'#ffffff'
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
  },
  carAnimation: {
    position: 'absolute',
    bottom: screenHeight * 0.1,
    left: 0,
    width: screenWidth * 0.4,
    height: screenWidth * 0.2,
    top:screenHeight*0.05
  },
  buttonStyle: {
    marginHorizontal: screenWidth * 0.05,
    marginTop: screenHeight * 0.02,
    paddingHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.02,
    borderRadius: screenWidth * 0.03,
    borderColor: 'white', //#112D51
    borderWidth: 5,
    backgroundColor: '#F22F47',//
    justifyContent: 'center',
    alignItems: 'center',
    height: screenHeight * 0.07,
    width: screenWidth * 0.35,
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 9 },
    shadowOpacity: 0.1,
  },
  buttonText: {
    marginTop: screenHeight * 0.01,
    marginBottom: screenHeight * 0.01,
    fontFamily: 'Little Comet Demo Version',
    fontSize: screenWidth * 0.08,
    color: '#ffffff',
    fontWeight: '600',
    verticalAlign: 'middle',
  },
  imageStyle: {
    marginTop: -screenHeight * 0.05,
    resizeMode: 'contain',
    textAlign: 'center',
    height:200
  },
  titleStyle: {
    fontSize: screenWidth * 0.06,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    marginBottom: screenHeight * 0.02,
    textAlign: 'center',
    fontFamily: 'Little Comet Demo Version',
    fontSize: 42,
  },
  subtitleStyle: {
    // marginTop: -screenHeight * 0.11,
    marginBottom: screenHeight * 0.1,
    textAlign: 'center',
    fontFamily: 'Quicksand-SemiBold',
    color: 'black',
    paddingHorizontal: screenWidth * 0.06,
    fontWeight: '700',
    fontSize: screenWidth * 0.04,
    
  },
  road: {
    position: 'absolute',
    bottom: 0, // Adjusted to align with the bottom
    left: 0,
    width: '100%',
    height: 100,
    top:screenHeight*0.07,
  },
});

export default Onboard;
