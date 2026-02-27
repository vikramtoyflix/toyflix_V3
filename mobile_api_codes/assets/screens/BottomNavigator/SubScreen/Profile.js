import { StyleSheet, Text, View, ImageBackground, Image, TouchableOpacity, Dimensions, ScrollView, StatusBar, Linking, Modal, Alert,ActivityIndicator } from 'react-native';
import React, { useState, useEffect,useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Profilebutton from '../components/Profilebutton';
import * as Animatable from 'react-native-animatable';
import { useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
const { width, height } = Dimensions.get('window');
import axios from 'axios';
import LinearGradient from 'react-native-linear-gradient';

const Profile = () => {
    const navigation = useNavigation();
    const [userName, setUserName] = useState('');
    const user = auth().currentUser; // Get the current user from Firebase
    const [hasActivePlan, setHasActivePlan] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [profileImage, setProfileImage] = useState(require('../src/profile.png')); // Default profile image
    const [profileImageUri, setProfileImageUri] = useState(null); // URI for uploaded picture
    const [membershipDetails, setMembershipDetails] = useState(null);
    const [termId, setTermId] = useState(null);
    const [loading, setLoading] = useState(false);
      const [subs, setSubs] = useState('');

    const handledelete = async () => {
      try {
        // Fetch the token from AsyncStorage
        const token = await AsyncStorage.getItem('token');
    
        if (!token) {
          console.log('No access token found, redirecting to login');
          navigation.replace('Login'); // Redirect to login if no token
          return;
        }
    
        // Call the delete account API
        const response = await axios.delete(
          'https://toyflix.in/wp-json/api/v1/delete_account',
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
            data: { token }, // Use the `data` key for the body in DELETE requests
          }
        );
    
        if (response.status === 200 && response.data.status === 200) {
          console.log('Account deleted successfully:', response.data.message);
    
          // Clear stored tokens
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('refreshToken');
    
          // Navigate to login
          navigation.replace('Login');
        } else {
          console.error('Failed to delete account', response.data);
          Alert.alert('Delete Failed', response.data.message || 'Please try again.');
        }
      } catch (error) {
        console.error('Error during account deletion:', error);
        Alert.alert('Error', 'Something went wrong, please try again.');
      }
    };
    

    // Logout function
    const handleLogout = async () => {
        try {
          // Fetch the token from AsyncStorage
          const token = await AsyncStorage.getItem('token');
          
          if (!token) {
            console.log('No access token found, redirecting to login');
            navigation.replace('Login'); // Redirect to login if no token
            return;
          }
          
          // Call the logout API
          const response = await axios.post('https://toyflix.in/wp-json/api/v1/logout/', null, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            params: { token },
        });
      
          if (response.status === 200) {
            // Clear stored tokens
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('refreshToken');
            console.log('Logout successful');
      
            // Navigate to login
            navigation.replace('Login');
          } else {
            console.error('Failed to logout', response.data);
            Alert.alert('Logout Failed', 'Please try again.');
          }
        } catch (error) {
          console.error('Error during logout:', error);
          Alert.alert('Error', 'Something went wrong, please try again.');
        }
      };
      
      useFocusEffect(
        useCallback(() => {
          let isActive = true; // Prevent state updates if unmounted
          setLoading(true);
      
          const fetchUserData = async () => {
            try {
              // Fetch token and API request in parallel
              const tokenPromise = AsyncStorage.getItem('token');
              const [token] = await Promise.all([tokenPromise]);
      
              if (!token) {
                console.log("Token not found");
                setLoading(false);
                return;
              }
      
              console.log("Token:", token);
      
              const response = await axios.get('https://toyflix.in/wp-json/api/v1/user-profile/', {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                params: { token },
              });
      
              if (!isActive) return;
      
              if (response.data?.status === 200) {
                const userData = response.data.data;
                const { termId, subscription_details, nickname } = userData;
      
                if (Array.isArray(subscription_details)) {
                  // Find the most recent subscription detail
                  const recentDetail = subscription_details.reduce((latest, entry) =>
                    (!latest || new Date(entry.first_purchase_date) > new Date(latest.first_purchase_date))
                      ? entry
                      : latest, null
                  );
      
                  setMembershipDetails(recentDetail || null);
                  setHasActivePlan(recentDetail?.subscription_status === "Active");
                  setTermId(termId);
                  setUserName(nickname);
                  setSubs(recentDetail?.subscription_plan_id || null);
      
                  console.log("Subscription Plan ID:", recentDetail?.subscription_plan_id);
                } else {
                  setMembershipDetails(null);
                  setHasActivePlan(false);
                  setTermId(null);
                  setSubs(null);
                }
              } else {
                console.log("Unexpected API response format");
              }
            } catch (err) {
              console.error("API Error:", err.response?.data || err.message);
            } finally {
              if (isActive) setLoading(false);
            }
          };
      
          fetchUserData();
      
          return () => { isActive = false; }; // Cleanup function
        }, [navigation])
      );
    
    
    const handleSubscribeButtonPress = () => {
        console.log("Button Pressed");
        console.log("Membership Details:", membershipDetails);
        
        if (membershipDetails) {
          const { subscription_status } = membershipDetails;
          console.log("Subscription Status:", subscription_status);
          
          if (subscription_status === "Active") {
            console.log("Active subscription");
            navigation.navigate('Categories', { 
              termId: termId || 0, 
              memberId: subs 
            });
          } else {
            console.log("Navigating to Member (inactive subscription)");
            navigation.navigate('Member');
          }
        } else {
          console.log("Navigating to Member (no membership details)");
          navigation.navigate('Member');
        }
      };
  // Handle My Plans button press
 // Handle My Plans button press
// Handle My Plans button press
    const handleMyPlansPress = () => {
        if (membershipDetails && membershipDetails.subscription_status === "Active") { 
            // Check if membershipDetails exist and if the plan is active
            setModalVisible(true);
        } else {
            // No active plan, show alert
            Alert.alert(
                "No Active Plan",
                "You don't have any active plans. Please subscribe to one.",
                [{ text: "Membership", onPress: () => navigation.navigate('Member') }]
            );
        }
    };
    




    // Open terms and privacy policy URLs
    const handlePressTerms = () => {
      Linking.openURL('https://toyflix.in/terms-and-conditions/');
    };
  
    const handlePressPrivacy = () => {
      Linking.openURL('https://toyflix.in/toyflix-privacy-policy/');
    };


    const uploadImage = () => {
      const options = {
        mediaType: 'photo',
        quality: 1,
      };
  
      launchImageLibrary(options, (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.log('Image Picker Error: ', response.errorMessage);
        } else if (response.assets && response.assets.length > 0) {
          const imageUri = response.assets[0].uri;
          console.log('Selected image URI: ', imageUri); // Debug: Log the selected image URI
  
          // Update profile image state
          setProfileImage({ uri: imageUri });
        }
      });
    };
  
  
    return (
        <View style={{ flex: 1 }}>
            <StatusBar backgroundColor='#093974' barStyle='dark-content' />
            <ImageBackground style={{ width: '100%', height: '100%' }}
                source={require('../../../src/newbg.png')} resizeMode="cover" >
                     {loading && (
                                        <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="large" color="#0000ff" />
                                </View>
                            )}
                <ScrollView style={{ flex: 1 }}>
                    <View style={{ top: height * -0.05 }}>
                    {/* <View style={[styles.profileContainer, { marginTop: height * 0.14 }]}>
          
            <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Image source={require('../src/profile.png')} style={styles.dp} />
            </TouchableOpacity>

           
            <TouchableOpacity onPress={uploadImage}>
                <Image source={require('../src/EditDp.png')} style={styles.editdp} />
            </TouchableOpacity>
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <Image source={require('../src/profile.png')} style={styles.fullImage} />
                    <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View> */}

                        {/* <Text style={styles.username}>{user?.displayName || 'User Name'}</Text> */}

                        <View style={{ rowGap: height * 0.02, marginTop: height * 0.12 }}>
                           
                            <Profilebutton icon={require('../../BottomNavigator/src/Diamond.png')} name={"My Plans"} textColor="black" padleft={width * 0.02} nav={handleMyPlansPress} />
                            <Profilebutton icon={require('../../BottomNavigator/src/myorder.png')} name={"My Orders"} textColor="black" padleft={width * 0.02} nav={()=>navigation.navigate("Mytoys")} />
                            {membershipDetails && membershipDetails.subscription_status == "Active" && (
    <Profilebutton icon={require('../../BottomNavigator/src/Upgrade.png')} name={"Upgrade plan"} textColor="black" padleft={width * 0.02} nav={() => navigation.navigate("Member")} />
)}
                            <Profilebutton icon={require('../../BottomNavigator/src/toys.png')} name={"Add Toys"} textColor="black" padleft={width * 0.02} nav={handleSubscribeButtonPress} />
                            <Profilebutton icon={require('../../BottomNavigator/src/EditIcon.png')} name={"Account settings"} textColor="black"  padleft={width * -0.21} nav={() => navigation.navigate('ProfileUpdate')} />
                            <Profilebutton icon={require('../../BottomNavigator/src/term.png')} name={"Terms / Conditions"} textColor="black"  padleft={width * -0.3} nav={handlePressTerms} />
                            <Profilebutton icon={require('../../BottomNavigator/src/policy1.png')} name={"Privacy Policy"} textColor="black"  padleft={width * -0.093} nav={handlePressPrivacy} />
                            <Profilebutton icon={require('../../BottomNavigator/src/Logout.png')} name={"Delete account"} textColor="red"  padleft={width * 0.05} nav={handledelete} />
                                                        <Profilebutton icon={require('../../BottomNavigator/src/Logout.png')} name={"Log out"} textColor="red"  padleft={width * 0.05} nav={handleLogout} />
                        </View>
                         {/* Modal for membership details */} 
                         <Modal
    animationType="slide"
    transparent={true}
    visible={modalVisible}
    onRequestClose={() => setModalVisible(false)}
>
    <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✖</Text>
            </TouchableOpacity>
            {membershipDetails ? (
                <View>
                    {/* Display subscription name and status */}
                    <Text style={styles.modalTitle}>{membershipDetails.subscription_name}</Text>
                    <Text style={styles.sub}>Status: {membershipDetails.subscription_status }</Text>
                    
                    {/* Handle missing fields by providing fallback */}
                    <Text style={styles.sub}>First Purchase Date: {membershipDetails.first_purchase_date || "N/A"}</Text>
                    <Text style={styles.sub}>Expiry Date: {membershipDetails.expiry_date }</Text>
                    <Text style={styles.sub}>Duration: {membershipDetails.subscription_months } months</Text>
                    <Text style={styles.sub}>Elapsed Months: {membershipDetails.elapsed_months }</Text>
                    {/* <Text style={styles.sub}>Age Group: {membershipDetails.age_group }</Text> */}
                    <Text style={styles.sub}>Renewal Date: {membershipDetails.renewal_date || "N/A"}</Text>
                </View>
            ) : (
                <Text style={styles.sub}>No membership details available.</Text>
            )}
        </View>
    </View>
</Modal>

                    </View>
                </ScrollView>
            </ImageBackground>
        </View>
    );
};

export default Profile;

const styles = StyleSheet.create({
    profileContainer: {
        backgroundColor: 'white',
        width: width * 0.4,
        height: width * 0.4,
        alignSelf: 'center',
        borderRadius: width * 0.4 / 2,
    },
    dp: {
        width: width * 0.39,
        height: width * 0.39,
        alignSelf: 'center',
        borderRadius: width * 0.39 / 2,
    },
    editdp: {
        width: width * 0.11,
        height: width * 0.11,
        marginTop: -width * 0.06,
        alignSelf: 'center',
    },
    username: {
        textAlign: "center",
        marginTop: height * 0.03,
        fontSize: height * 0.04,
        fontFamily: 'Little Comet Demo Version',
        color: 'white',
        fontWeight: '600'
    },
    Arrow: {
        height: 50,
        width: 50,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    fullImage: {
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    closeButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    closeButtonText: {
        color: '#000',
        fontWeight: 'bold',
    },
    backButton: {
        position: 'absolute',
        top: height * 0.05,
        left: height * 0.02,
        padding: 10,
        zIndex: 10, // Ensure it's on top of other elements
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Background with transparency
  },
  modalContent: {
      width: width * 0.8,
      backgroundColor: '#C2DEFF',
      borderRadius: 10,
      padding: 20,
      alignItems: 'center',
  },
  closeButton: {
      position: 'absolute',
     
      right: 10,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Regular',
    color: "#000000",
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
  },
  loadingContainer: {
    top:10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: Adds a semi-transparent background
},
loadingOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: semi-transparent background overlay
  zIndex: 10, // Ensures it's on top of other components
},

});