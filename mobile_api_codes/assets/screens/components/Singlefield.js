import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';


const Singlefield = ({message,keyboardType,F1}) => {
  const[f1,setf1]=useState('');
  return (
    <View style={styles.single}>
      <Text style={{marginBottom:10,fontFamily: 'Akrobat-SemiBold',fontSize:16,color:'white'}}>
      {message}
      </Text> 
      <TextInput  onChangeText={(txt)=>setf1(txt)}
        style={styles.mobileInput2} 
         maxLength={10}
        keyboardType={keyboardType}
      />
      
    </View>
  );
};

const styles = StyleSheet.create({
  single: {
    flexDirection: 'column',
    alignItems: 'left',
    padding:10,
    borderRadius: 10,
  },
  mobileInput2: {
    
    borderWidth: 2,
    borderColor: '#FFFFFF',
    height:40,
    borderRadius: 10,
    color: "white",
    fontSize: 18,
    fontFamily: 'Akrobat-SemiBold',
    paddingLeft:15,
    paddingRight:15,
    width:"100%",
    
    
    
  },
});

export default Singlefield;