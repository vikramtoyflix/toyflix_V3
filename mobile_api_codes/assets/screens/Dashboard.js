import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import GifImage from '@lowkey/react-native-gif';

const dashboard = () => {
  return (
    <View>
      <Text>dashboard</Text>
      <GifImage
  source={{
    uri:
      'https://media.tenor.com/images/1c39f2d94b02d8c9366de265d0fba8a0/tenor.gif',
  }}
  style={{
    width: 100,
    height: 100,
  }}
  resizeMode={'cover'}
/>;
    </View>
  )
}

export default dashboard

const styles = StyleSheet.create({})