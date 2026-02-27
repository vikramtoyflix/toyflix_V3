import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'

const Button1 = () => {
  return (

    <View>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Login with OTP</Text>
      </TouchableOpacity>
    </View>

  )
}

export default Button1

const styles = StyleSheet.create({
  button: {
    marginTop: 25,
    paddingVertical: 6,
    paddingHorizontal: 90,
    backgroundColor: '#4169E1',
    borderRadius: 15,
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: '#F3C853',
    borderWidth: 5,
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 9 },
    shadowOpacity: 0.1,
  },
})