import { StyleSheet, Text, View ,Dimensions ,ImageBackground,TouchableOpacity,Image, StatusBar} from 'react-native'
import React from 'react'
import { useNavigation } from '@react-navigation/native';
import Home1 from '../../Home1';
import BottomNavigator from '../BottomNavigator';
import * as Animatable from 'react-native-animatable';


const { width, height } = Dimensions.get('window');
const ExhangeOldToysElements = () => {
    const navigation = useNavigation();
  return (
    
    <View style={{ flex: 1 }} >
       <StatusBar backgroundColor='#0D2D54' barStyle='dark-content' />
        <ImageBackground
        style={{ flex: 1 }} 
        source={require('../../../src/111.png')}
        resizeMode="cover"
      >
        <View style={styles.topbar} >
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={{zIndex: 10,}}>
          <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
        </TouchableOpacity>
        <Text  style={styles.topheading}>Exhange Old Toys</Text>
        </View>
        <Text  style={styles.head}>Now you can exchange old toys and get cashback on our subscription.</Text>
         <View style={{flex:1,justifyContent:'center',alignSelf:'center'}}>
          
         <Image  source={require('../src/ExhangeOldToysElements/content.png')} style={styles.main} />
         </View>
         <TouchableOpacity
              activeOpacity={0.8}
              style={styles.button}
              onPress={() => navigation.navigate("TestLinking")}
              
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
      </ImageBackground>
    </View>
    
  )
}

export default ExhangeOldToysElements

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
    top:height*0.019,
    fontWeight:"600"
    },
    Arrow: {
        height: 20,
        width: 30,
        top: height * 0.043,
        left: height * 0.02,
      },
      main:{
        // width:width*0.7,
        // height:height*0.38,
        height:350,
        width:300,
        top:height*-0.04,
      },
      head:{
        top:height*0.05,
        textAlign:'center',
        fontFamily: 'Urbanist-Regular',
        fontWeight: '600',
        color:'black',
        fontSize:18,
        paddingLeft:width*0.07,
        paddingRight:width*0.07,
      },
      button: {
        
        height:height*0.07,
        width:width*0.6,
        borderRadius:15,
        alignItems: 'center',
        alignSelf: 'center',
        borderColor: '#F3C853',
        borderWidth: 5,
        shadowColor: 'black',
        shadowOffset: { width: 2, height: 9 },
        shadowOpacity: 0.1,
        backgroundColor:'#112D51',
        top:-height*0.1,
        textAlign:'center'
        
      },
      buttonText: {
        fontFamily: 'Little Comet Demo Version',
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '600',
        top: height * 0.012,
      },
})