import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const Box = () => {
  return (
    <View>
      <TextInput keyboardType="phone-pad"
        maxLength={10} styles={styles.box}>

    </TextInput>
    </View>
  )
}

export default Box

const styles = StyleSheet.create({
    box:{
        width:40,
        height:40,
        borderWidth:2,
       }
})