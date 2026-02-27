import { StyleSheet, Text, View ,Dimensions ,ImageBackground,TouchableOpacity,Image, StatusBar} from 'react-native'
import React from 'react'
import { useNavigation } from '@react-navigation/native';
import Home1 from '../../Home1';
import BottomNavigator from '../BottomNavigator';
import * as Animatable from 'react-native-animatable';
import ExploreApi from '../../../API/ExploreApi';
const { width, height } = Dimensions.get('window');
const RideOnToy = () => {
    const navigation = useNavigation();
  return (
   
      <View style={{ flex: 1 }} >
        <StatusBar style={{backgroundColor:'#FFFFFF'}} barStyle='dark-content' /> 
        <ImageBackground
        style={{ flex: 1 }} 
        source={require('../../../src/111.png')}
        resizeMode="cover"
      >
        <View style={styles.topbar} >
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={{zIndex: 10,}}>
          <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
        </TouchableOpacity>
        <Text animation="zoomIn" duration={3000} style={styles.topheading}>Ride On Toy</Text>
        </View>
        <ExploreApi/>
    </ImageBackground>
    </View>
  )
}

export default RideOnToy

const styles = StyleSheet.create({
    topbar:{
        height:height*0.12,
        backgroundColor:'white',
        justifyContent:'center',
     },
       topheading:{
        fontFamily: 'Little Comet Demo Version',
       fontWeight: '600',
       fontSize: width * 0.07,
       color: '#0D2D54',
       textAlign:'center',
       top:height*0.017,
       fontWeight:"600",
       left: height * 0.01,
       },
       Arrow: {
        height: 20,
        width: 30,
        top:height*0.043,
        left:width*0.05,
        zIndex:9
    },
})