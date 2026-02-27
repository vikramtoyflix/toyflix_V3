import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, Text, Alert, TouchableOpacity, ImageBackground, StatusBar, Dimensions, Image, ActivityIndicator,StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import qs from 'qs';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const ProfileUpdate = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [pincode, setPincode] = useState('');
  const [mobile, setMobile] = useState('');
  const [membershipDetails, setMembershipDetails] = useState(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [termId, setTermId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();

  // Fetch user profile when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchUserProfile = async () => {
        try {
          setLoading(true);
          const token = await AsyncStorage.getItem('token');
          if (!token) {
            throw new Error('Token not found');
          }

          const response = await axios.get(
            'https://toyflix.in/wp-json/api/v1/user-profile/',
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
              },
              params: {
                token: token,
              },
            }
          );

          if (response.data && response.data.status === 200) {
            const userData = response.data.data;
            const { first_name, last_name, nickname, email, pincode, mobile, termId, subscription_details } = userData;

            setFirstName(first_name || '');
            setLastName(last_name || '');
            setNickname(nickname || '');
            setEmail(email || '');
            setPincode(pincode || '');
            setMobile(mobile || '');
            setTermId(termId || null);
            setMembershipDetails(subscription_details || null);
            setHasActivePlan(subscription_details?.subscription_status === "Active");
          } else {
            throw new Error('Unexpected response format');
          }
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to fetch profile data.');
        } finally {
          setLoading(false);
        }
      };

      fetchUserProfile();
    }, [])
  );

  const handleUpdateProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Token not found');
      }

      const body = qs.stringify({
        first_name: firstName,
        last_name: lastName,
        nickname: nickname,
        email: email,
        pincode: pincode,
        mobile: mobile,
      });

      const response = await axios.post('https://toyflix.in/wp-json/api/v1/update-user-profile', body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        params: {
          token: token,
        },
      });

      if (response.status === 200) {
        Alert.alert("Profile Updated", "Your profile has been successfully updated!");
      } else {
        Alert.alert("Error", "There was a problem updating your profile.");
      }
    } catch (error) {
      Alert.alert("Error", error.response ? error.response.data.message : "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <ImageBackground style={styles.backgroundImage} source={require('../src/111.png')} resizeMode="cover">
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.arrowContainer}>
            <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
          </TouchableOpacity>
          <Text style={styles.topheading}>Update Profile</Text>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.container}>
            {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
            <TextInput style={styles.input} placeholder="First Name" value={firstName} onChangeText={setFirstName} placeholderTextColor="black" />
            <TextInput style={styles.input} placeholder="Last Name" value={lastName} onChangeText={setLastName} placeholderTextColor="black" />
            <TextInput style={styles.input} placeholder="Nickname" value={nickname} onChangeText={setNickname} placeholderTextColor="black" />
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor="black" />
            <TextInput 
  style={styles.input} 
  placeholder="Pincode" 
  value={pincode} 
  onChangeText={setPincode} 
  keyboardType="numeric" 
  placeholderTextColor="black" 
  maxLength={6} 
/>

{/* <TextInput 
  style={styles.input} 
  placeholder="Mobile" 
  value={mobile} 
  onChangeText={setMobile} 
  keyboardType="phone-pad" 
  placeholderTextColor="black" 
  maxLength={10} 
/> */}

            <TouchableOpacity style={styles.continueButton} onPress={handleUpdateProfile}>
              <Text style={styles.continueButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        )}
      </ImageBackground>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
   
    padding: 16,
    justifyContent: 'center',
    top: height * 0.1,
  },
  input: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
    marginTop: 20,
  },
  topbar: {
    height: height * 0.12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    position: 'relative',
  },
  topheading: {
    fontFamily: 'Little Comet Demo Version',
    fontWeight: '600',
    fontSize: width * 0.07,
    color: '#0D2D54',
    textAlign: 'center',
    top: height * 0.03,
  },
  arrowContainer: {
    position: 'absolute',
    left: 20,
    top: height * 0.03,
  },
  Arrow: {
    height: 20,
    width: 30,
    top: height * 0.046,
  },
  
  continueButton: {
    // marginTop: 5,
    backgroundColor: '#F22F47',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    position:'absolute',
    top: height * 0.49,
    width:'100%',
    left: width * 0.04,
    height:height*0.06,
    borderColor:'white',
    borderWidth:3,
    borderRadius:20
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Little Comet Demo Version',
    // fontFamily:'600'
  },
});

export default ProfileUpdate;

