import React from 'react';
import { View, TouchableOpacity, Linking, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; // You can use any icon library

const FloatingButtons = () => {
  // Function to open WhatsApp
  const openWhatsApp = () => {
    const url = 'whatsapp://send?phone=+919108928610';
    Linking.openURL(url)
      .catch(() => alert('Make sure WhatsApp is installed on your device'));
  };

  // Function to make a call
  const makeCall = () => {
     const url = 'tel:+919108734535';
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* WhatsApp Button */}
      <TouchableOpacity style={styles.whatsappButton} onPress={openWhatsApp}>
        <Image 
          source={require('../../src/whatsapp.png')}  // Replace with your WhatsApp icon
          style={styles.icon} 
        />
      </TouchableOpacity>
      {/* Call Button */}
      <TouchableOpacity style={styles.callButton} onPress={makeCall}>
      <Image 
          source={require('../../src/Phone.png')}  // Replace with your WhatsApp icon
          style={styles.icon} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 130,
    right: 20,
    zIndex: 100,  // Ensures it stays on top
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    padding: 15,
    borderRadius: 50,
    marginBottom: 10,
    elevation: 5,  // Shadow effect for Android
  },
  callButton: {
    backgroundColor: '#34B7F1',
    padding: 15,
    borderRadius: 50,
    elevation: 5,
  },
  icon: {
    width: 20,
    height: 20,
  
  },
});

export default FloatingButtons;
