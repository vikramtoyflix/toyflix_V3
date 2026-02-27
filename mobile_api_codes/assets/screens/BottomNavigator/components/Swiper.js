import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

const Swiper = () => {
    const images = [
        require('../src/HomeSlider/1211.png'),
        require('../src/HomeSlider/1111.png'),
        require('../src/HomeSlider/131.png')
    ];

    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            let nextIndex = (currentIndex + 1) % images.length; // Loop back to the first image
            setCurrentIndex(nextIndex);
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        }, 5000); // Changed to 5000ms (5 seconds)

        return () => clearInterval(interval); // Clear the interval on component unmount
    }, [currentIndex]);

    const renderDots = () => {
        return (
            <View style={styles.dotsContainer}>
                {images.map((_, index) => (
                    <View 
                        key={index} 
                        style={[
                            styles.dot, 
                            { opacity: currentIndex === index ? 1 : 0.5 }
                        ]}
                    />
                ))}
            </View>
        );
    };

    return (
        <View>
            <View style={styles.container}>
                <FlatList
                    ref={flatListRef}
                    data={images}
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    horizontal
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity>
                            <Image
                                source={item}
                                style={styles.topswipe}
                                animation="fadeInRight"
                                duration={2000}
                                resizeMode="contain" // Ensures the whole image fits without cutting
                            />
                        </TouchableOpacity>
                    )}
                />
            </View>
            {renderDots()}
        </View>
    );
}

export default Swiper;

const styles = StyleSheet.create({
    container: {
        height: height * 0.18, 
        width: width * 0.88,  
        alignSelf: 'center',
    },
    topswipe: {
        height: height * 0.22, 
        width: width * 0.86, 
        borderRadius: width * 0.02,
        borderWidth: 1,
        marginHorizontal: width * 0.01,
        borderColor: 'transparent',
        alignSelf: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8, // Adjust the spacing between the slider and dots as needed
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'blue', // Change color to match your design
        marginHorizontal: 4, // Space between dots
        top:10
    },
});
