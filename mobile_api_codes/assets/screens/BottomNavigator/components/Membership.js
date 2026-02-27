import { StyleSheet, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const Membership = ({ txt, trialplan, sub1, sub2, sub3, prize1, prize2, prize3, sub4, sub5, height1, selected, onSelect,sub6,sub7 ,sub8 ,sub9 ,sub12,sub10 ,sub11  }) => {
  return (
    <TouchableOpacity onPress={onSelect}>
      <LinearGradient
      colors={selected ? ['#000000', '#000000', '#6A5ACD'] : ['#EDE7F6', '#E1D5E7']}
      // More black dominance
        locations={[0, 0.8, 1]} // 80% black, 20% golden
        style={[styles.container, { height: height1 }]}
      >
        <View style={{ width: width * 0.84, flexDirection: 'row' }}>
          <View style={{ width:"100%" }}>
            <Text style={styles.head}>
              {txt}
            </Text>
            <View style={{ flexDirection: 'row',top:6 }}>
            <View style={{ width:"100%"}}>
                <Text style={styles.subtext}>{trialplan}</Text>
                </View>
              <View style={{ padding: 10,top:10 }}>
                
                <View style={{ top: height * 0.04,left:width*-0.86,width:"83%",rowGap:10,paddingBottom:60 }}>
                  <Text style={styles.subb}>{sub1}</Text>
                  <Text style={styles.subb}>{sub2}</Text>
                  <Text style={styles.subb}>{sub3}</Text>
                  <Text style={styles.subb}>{sub4}</Text>
                  <Text style={styles.subb}>{sub5}</Text>
                  <Text style={styles.subb}>{sub6}</Text>
                  <Text style={styles.subb}>{sub7}</Text>
                  <Text style={styles.subb}>{sub8}</Text>
                  <Text style={styles.subb}>{sub9}</Text>
                  <Text style={styles.subb}>{sub10}</Text>
                  {/* <Text style={styles.subb}>  {sub11}</Text>
                  <Text style={styles.subb}>  {sub12}</Text> */}
                </View>
              </View>
            </View>
          </View>
          <View style={{ justifyContent: 'center' }}>
            <View style={{ left: width * -0.17, justifyContent: 'center' }}>
              <Text style={styles.prize}>₹{prize1}</Text>
              <Text style={styles.prize1}>₹{prize2}</Text>
              <Text style={styles.prize3}>{prize3}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default Membership;

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    width: width / 1.1,
    alignSelf: 'center',
    flexDirection: 'row',
    padding: width * 0.03,
    borderRadius: 20,
    borderWidth: 5,
    borderColor: "#FFC824",
  },
  head: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Regular',
    color: "#FFC727",
    textAlign:"center",
   
  },
  subtext: {
    fontSize: 18,
    textAlign: 'left',
    fontFamily: 'Urbanist-Regular',
    fontWeight: 'bold',
    color: "white",
    left: width * -0.01,
    //  backgroundColor:'yellow',
     textAlign:'center',
     borderRadius:100
   
  },
  prize: {
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    fontSize: 21,
    top: height * 0.016,
    left: width * -0.06,
    textDecorationLine: 'line-through',
    color: 'red'
  },
  prize1: {
    fontFamily: 'Urbanist-Regular',
    fontWeight: 'bold',
    fontSize: 36,
    left: width * -0.1,
    color: "white"
  },
  prize3: {
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    fontSize: 12,
    top: height * -0.006,
    textAlign: 'center',
    left: width * -0.1,
    color: "white"
  },
  subb: {
    fontFamily: 'Urbanist-Regular',
    fontWeight: '600',
    fontSize: 14,
    color: "white"
  }
});