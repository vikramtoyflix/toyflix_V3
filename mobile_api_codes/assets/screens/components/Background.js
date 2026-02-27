import { StyleSheet, Text, View,ImageBackground } from 'react-native'
import React from 'react'

const Background = () => {
  return (
    <View>
      <ImageBackground
        source={require('../../src/bg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover">

        </ImageBackground>
    </View>
  )
}

export default Background

const styles = StyleSheet.create({})