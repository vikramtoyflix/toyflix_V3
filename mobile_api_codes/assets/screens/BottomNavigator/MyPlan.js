import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import  { useState,useEffect } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Profile from './SubScreen/Profile'
const MyPlan = () => {
  const navigation = useNavigation();
  useEffect(() => {
    // This useEffect will run when the component is mounteds
    console.log('Component mounted!');

    // You can put your reset logic here to reset the navigation stack
    navigation.reset({
      index: 0,  // Index of the screen to reset to (HomeScreen will be at index 0)
      routes: [{ name: 'home1' }],  // Specify the screen you want to navigate to
    });
  }, [navigation]);
  return (
    
      <Profile/>
    
  )
}

export default MyPlan

const styles = StyleSheet.create({})