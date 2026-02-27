import { Image, StyleSheet, View, Dimensions, Platform } from 'react-native';
import React from 'react';
import Home from './Home';
import  { useEffect ,useState } from 'react';
import MyPlan from './MyPlan';
import AddToys from './AddToys';
import { useFocusEffect } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FloatingButtons from '../components/FloatingButtons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

const Tab = createBottomTabNavigator();
const { width, height } = Dimensions.get('window');

const tabBarStyle = {
  height: Platform.OS === 'ios' ? height * 0.14 : height * 0.095,
};

const tabBarLabelStyle = {
  paddingBottom: Platform.OS === 'ios' ? height * 0.015 : height * 0.009,
  fontSize: Platform.OS === 'ios' ? width * 0.045 : width * 0.04,
  fontFamily: 'Akrobat-SemiBold',
  fontWeight: 'bold',
};



const BottomNavigator = () => {
  const [token1, setToken1] = useState(false);
  
  useFocusEffect(
    useCallback(() => {
      const getToken = async () => {
        try {
          const storedToken = await AsyncStorage.getItem('token');
          console.log("Token fetched:", storedToken);
          setToken1(!!storedToken); // Convert to boolean
        } catch (error) {
          console.error("Error fetching token:", error);
        }
      };
      getToken();
    }, [])
  );
  


  
  return (
    <View style={styles.container}>
      <Tab.Navigator>
        <Tab.Screen
          name="Home"
          component={Home}
          options={{
            tabBarStyle,
            tabBarLabelStyle,
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <Image
                source={require('../BottomNavigator/src/Home.png')}
                style={[
                  styles.icon,
                  {
                    tintColor: focused ? '#174CAF' : 'black',
                    height: Platform.OS === 'ios' ? height * 0.04 : height * 0.035,
                    width: Platform.OS === 'ios' ? height * 0.04 : height * 0.035,
                  },
                ]}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Explore toys"
          component={AddToys}
          options={{
            tabBarStyle,
            tabBarLabelStyle,
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <Image
                source={require('../BottomNavigator/src/Explore.png')}
                style={[
                  styles.icon,
                  {
                    tintColor: focused ? '#174CAF' : 'black',
                    height: Platform.OS === 'ios' ? height * 0.04 : height * 0.035,
                    width: Platform.OS === 'ios' ? height * 0.04 : height * 0.035,
                  },
                ]}
              />
            ),
          }}
        />
     {token1 &&  (<Tab.Screen
          name="My Profile"
          component={MyPlan}
          options={{
            tabBarStyle,
            tabBarLabelStyle,
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <Image
                source={require('../BottomNavigator/src/MyToy.png')}
                style={[
                  styles.icon,
                  {
                    tintColor: focused ? '#174CAF' : 'black',
                    height: Platform.OS === 'ios' ? height * 0.04 : height * 0.035,
                    width: Platform.OS === 'ios' ? height * 0.04 : height * 0.035,
                  },
                ]}
              />
            ),
          }}
        />
  )}
      </Tab.Navigator>
      <FloatingButtons />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  icon: {
    marginTop: Platform.OS === 'ios' ? height * 0.025 : height * 0.02,
  },
});

export default BottomNavigator;
