import { PermissionsAndroid, Platform, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Location Permission',
                    message: 'We need your location to provide accurate results.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('Location permission granted');
                getCurrentLocation();
            } else {
                console.log('Location permission denied');
                Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
            }
        } catch (err) {
            console.warn(err);
        }
    } else {
        getCurrentLocation(); // For iOS, permissions are handled differently
    }
};

const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            console.log('Latitude:', latitude, 'Longitude:', longitude);
        },
        (error) => {
            console.error('Error getting location:', error);
            Alert.alert('Error', 'Unable to retrieve location. Please try again.');
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
};
