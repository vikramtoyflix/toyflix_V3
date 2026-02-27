import { StyleSheet, View, ImageBackground, Image, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import Onboarding from 'react-native-onboarding-swiper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';


const Dots = ({ selected }) => {
  return (
    <Animatable.View
      style={{
        width: 14,
        height: 14, 
        marginHorizontal: 5,
        backgroundColor: selected ? '#FFC107' : '#ffffff',
        borderRadius: 7,
        marginBottom: 80,
        marginTop: -85,
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

const Skip = (props) => <Button text="Skip" {...props} />;
const Next = (props) => <Button text="Next" {...props} />;
const Done = (props) => <Button text="Done" {...props} />;

const Onboard = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../src/bg.jpg')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <Onboarding
          onSkip={() => navigation.navigate('Login')}
          onDone={() => navigation.navigate('Login')}
          DotComponent={Dots}
          SkipButtonComponent={Skip}
          NextButtonComponent={Next}
          DoneButtonComponent={Done}
          bottomBarHighlight={false}
          titleStyles={styles.titleStyle} 
          subTitleStyles={styles.subtitleStyle} 
          bottomBarHeight={150} 
          pages={[
            {
              backgroundColor: 'transparent',
              image: (
                <Animatable.Image 
                  source={require('../src/1.png')} 
                  style={styles.imageStyle}
                  animation="zoomIn"
                  duration={1200}
                />
              ),
              title: "",
              subtitle: (
                <Animatable.Text
                  animation="fadeInUp"
                  duration={1200}
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
                  source={require('../src/SECOND.png')} 
                  style={styles.imageStyle}
                  animation="zoomIn"
                  duration={1400}
                />
              ),
              title: "",
              subtitle: (
                <Animatable.Text
                  animation="fadeInUp"
                  duration={1400}
                  style={styles.subtitleStyle}
                >
                  Choose the preferred toy collection for your kids, keep them out of boredom. (Get new set every month).
                </Animatable.Text>
              ),
            },
            {
              backgroundColor: 'transparent',
              image: (
                <Animatable.Image 
                  source={require('../src/THIRD.png')} 
                  style={styles.imageStyle}
                  animation="zoomIn"
                  duration={1400}
                />
              ),
              title: "",
              subtitle: (
                <Animatable.Text
                  animation="fadeInUp"
                  duration={1400}
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
                  source={require('../src/FOURTH.png')} 
                  style={styles.imageStyle}
                  animation="zoomIn"
                  duration={1400}
                />
              ),
              title:"",
              subtitle: (
                <Animatable.Text
                  animation="fadeInUp"
                  duration={1400}
                  style={styles.subtitleStyle}
                >
                  We just don’t rent toys but we deliver a bundle of joy, adventure for kids. Explore our collection of premium toys. Come join us..!
                </Animatable.Text>
              ),
            },
          ]}
        />
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
  },
  buttonStyle: {
    marginHorizontal: 22,
    marginTop: -10,
    paddingHorizontal: 20, 
    marginBottom: -48,
    borderRadius: 13, 
    borderColor: '#F3C853', 
    borderWidth: 5, 
    backgroundColor: '#4169E1', 
    justifyContent: 'center',
    alignItems: 'center',
    height: 55,
    width: 144,
    shadowColor: 'black', 
    shadowOffset: { width: 2, height: 9 },
    shadowOpacity: 0.1,
  },
  buttonText: {
    marginTop: 9,
    marginBottom: 2,
    fontFamily: 'Little Comet Demo Version',
    fontSize: 32, 
    color: '#ffffff', 
    fontWeight: '600',
  },
  imageStyle: {
    marginTop: -30,
    resizeMode: 'contain',
  },
  titleStyle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitleStyle: {
    marginTop: -56,
    marginBottom: 55, 
    textAlign: 'center',
    fontFamily: 'Akrobat-SemiBold',
    color: '#ffffff',
    paddingHorizontal: 25, 
    fontWeight: '699',
    fontSize: 16,
  },
});

export default Onboard;
