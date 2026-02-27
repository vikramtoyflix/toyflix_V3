import { Image, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native'
import React from 'react'
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { useMembership } from './cart';
const { width, height } = Dimensions.get('window');

const PaymentButton = ({ icon, name, textColor, animate, padleft,nav }) => {
    const navigation = useNavigation();
    const { membershipPrice } = useMembership();
  return (
    <TouchableOpacity style={styles.button} onPress={nav}>
      <View style={styles.container} animation={animate} duration={2000}>
        <Image source={icon} style={styles.icon} />
        <View>
          <Text style={[styles.name, { color: textColor }]}>{name}</Text>
        </View>
        <View style={{ paddingLeft: width * 0.2 }}>
          <Image source={require('../src/forward.png')} style={[styles.Arrow, { marginLeft: padleft }]} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default PaymentButton

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    alignItems: 'center',
    display: 'flex',
    width: width * 0.9,  
    flexDirection: 'row',
    height: height * 0.06,  
    alignSelf: 'center',
    shadowColor: 'black',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "black",
    // top: height * 0.04,
  },
  Arrow: {
    height: height * 0.03,  
    width: height * 0.03,  
    alignSelf: "center",
    left: width * 0.2,
  },
  icon: {
    height: height*0.02,  
    width: width*0.14,  
    left: width * 0.05,
  },
  name: {
    fontSize: height * 0.015,  
    fontFamily: 'Quicksand-SemiBold',
    fontWeight: 'bold',
    left: width * 0.1,
  },
})