import {
  SafeAreaView,
  StyleSheet,
  View,
  StatusBar,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  FlatList,
  Text,
  ActivityIndicator,
  Linking,
} from 'react-native';
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native'; // Import navigation
import axios from 'axios'; // Import axios for API calls

const { width, height } = Dimensions.get('window');

const SearchResults = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState([]); // State for fetched items
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state
  const navigation = useNavigation(); // Use the navigation prop

  const fetchItems = async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const response = await axios.get('https://toyflix.in/wp-json/api/v1/search-products', {
        params: { query: searchTerm },
      });
      console.log('API Response:', response.data); // Log the response
      setItems(response.data); // Set the fetched items
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Error fetching items: ' + error.message);
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.productContainer}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.image} />
      )}
      <Text style={styles.title}>{item.title}</Text>
      {/* <Text style={[styles.originalPrice]}>
        {item.price === 0 ? 1999 : item.price}/month
      </Text> */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ProductPage', { item })}
      >
        <Text style={styles.buttonText}>Subscribe Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor="#174C8F" barStyle="light-content" />
      <ImageBackground
        style={styles.backgroundImage}
        source={require('../src/111.png')}
        resizeMode="cover"
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Image
            source={require('../src/arrow3.png')} // Use your back arrow image
            style={styles.backIcon}
          />
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="grey"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          </View>
          <TouchableOpacity onPress={fetchItems}>
            <Image
              source={require('../screens/BottomNavigator/src/search.png')}
              style={styles.searchIcon}
            />
          </TouchableOpacity>
        

        {/* Loading Indicator */}
        {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />}

        {/* Error Message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Results List */}
        <FlatList
          data={items}
          contentContainerStyle={styles.grid}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          horizontal={false}
          showsVerticalScrollIndicator={false}
        />
      </ImageBackground>
    </SafeAreaView>
  );
};

export default SearchResults;

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: height * 0.03, // Adjust the position based on your layout
    left: 25,
    zIndex: 10, // Ensure it's always above the content
  },
  backIcon: {
    width: 30,
    height: 25,
    tintColor: '#fff', // Tint to match the color scheme
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    width: width * 0.7, // 80% of screen width
    height: 40,
    paddingHorizontal: 20,
    elevation: 5, // Adds shadow on Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    marginTop: height * 0.02, // Leave space for the back button
    left: width * 0.04,
    
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingBottom: 100,
  },
  productContainer: {
    minHeight: 300,
    width: width * 0.42,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 18,
    position: 'relative',
    flexDirection: 'column',
    justifyContent: 'space-between',
    top: height * 0.04,
  },
  image: {
    height: height * 0.15,
    width: width * 0.35,
    marginBottom: 16,
    alignSelf: 'center',
    marginTop: 7,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
    textAlign: 'center',
    backgroundColor: 'white',
    color: '#3D7DCF',
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'green',
  },
  button: {
    backgroundColor: '#0080ff',
    borderRadius: 5,
    height: height * 0.04,
    width: width * 0.35,
    borderColor: '#F3C853',
    borderWidth: 2,
    alignSelf: 'center',
    marginBottom: 15,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    alignSelf: 'center',
  },
  loading: {
    marginTop: 10,
  },
  searchIcon:{
    width:25,
    height: 25,
    left:width*0.33,
    top: height * -0.04,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
});
