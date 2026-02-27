import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, TouchableOpacity, StatusBar, ImageBackground, Dimensions, ScrollView } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {  useRoute } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Example mapping of category names to image sources
const categoryImages = {
  '6m-2 years': require('../screens/BottomNavigator/src/Cateegory/1.png'),
  '2-3 years': require('../screens/BottomNavigator/src/Cateegory/2.png'),
  '3-4 years': require('../screens/BottomNavigator/src/Cateegory/3.png'),
  '4-6 years': require('../screens/BottomNavigator/src/Cateegory/4.png'),
  '6-8 years': require('../screens/BottomNavigator/src/Cateegory/5.png'),
  // Add more mappings as needed
};

const TestLinking = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const route = useRoute(); // Access the route object to get params (memberId)
  const memberId = route.params?.memberId; // Get memberId if available
  const up = route.params?.up ?? 0;


  console.log("helwwwwwww",up);
  // const { id } = route.params;
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          throw new Error('Token not found');
        }
        console.log('Token:', token);

          const response = await axios.get(
            'https://toyflix.in/wp-json/custom-api/v1/product-category-list/',
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
              },
              params: {
                token: token,  // Send the token as a query parameter if the endpoint expects it that way
              },
            }
          );
          

        console.log(response.data);
        console.log(response.headers);

        if (response.data && response.data.status === 200 && Array.isArray(response.data.data)) {
          setCategories(response.data.data);
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (err) {
        if (err.response) {
          console.log('API Response Error:', err.response.data); // Log the response data
        } else {
          console.error('Error fetching categories:', err);
        }
        setError(err.message || 'Failed to load categories.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);
  // const handleCategoryPress = (termId) => {
  //   console.log('Selected Term ID:', termId);
  //   navigation.navigate('Categories', { termId });
  // };
  const handleCategoryPress = (termId) => {
    console.log('Selected Term ID:', termId);

    // Check if memberId is available and pass it along with termId
    if (memberId) {
      navigation.navigate('Categories', { termId, memberId ,up:up });
    } else {
      navigation.navigate('Categories', { termId });
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <ImageBackground
        style={styles.backgroundImage}
        source={require('../src/111.png')}
        resizeMode="cover"
      >
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => navigation.navigate("Member")} style={styles.arrowContainer}>
            <Image source={require('../src/Arrow.png')} style={styles.Arrow} />
          </TouchableOpacity>
          <Text style={styles.topheading}>Subcategories</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollViewContainer} showsVerticalScrollIndicator={false} >
        <View style={styles.container}>
          {Array.isArray(categories) && categories.length > 0 ? (
            categories.map((item) => {
              // Log category name for debugging
              console.log('Category Name:', item.name);

              const categoryName = item.name.trim(); // Trim whitespace
              const categoryImage = categoryImages[categoryName];

              // Only render if the category has a corresponding image
              if (!categoryImage) {
                console.warn(`No image found for category: ${categoryName}`);
                return null; // Skip rendering if there's no image
              }

              return (
                <TouchableOpacity key={item.term_id} onPress={() => handleCategoryPress(item.term_id)} style={styles.categoryContainer}>
                  <Image source={categoryImage} style={styles.categoryImage} />
                  <Text style={styles.categoryItem}>{categoryName}</Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text>No categories found.</Text>
          )}
        </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
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
  scrollViewContainer: {
    
    paddingHorizontal: width * 0.08, // Consistent horizontal padding
    paddingBottom:50
  },
  Arrow: {
    height: 20,
    width: 30,
    top: height * 0.046,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 100,
    
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor:'#BBE9FF',
    // justifyContent:'center',
    borderRadius:100,
  },
  categoryImage: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 20,
    textAlign:'left'
  },
  categoryItem: {
    fontSize: 26,
    color: 'black',
    left:width*0.13
  },
});

export default TestLinking;
