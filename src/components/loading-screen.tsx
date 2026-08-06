import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const TRACK_WIDTH = 200;
const BAR_WIDTH = 80;

export function LoadingScreen(): React.JSX.Element {
  const translateX = useSharedValue(-BAR_WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(TRACK_WIDTH, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      false
    );
  }, []);

  const animatedBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        {/* Static Logo */}
        <Image
          source={require('@/assets/images/logo1.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Indeterminate Progress Bar */}
        <View style={styles.track}>
          <Animated.View style={[styles.bar, animatedBarStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 32,
  },
  track: {
    width: TRACK_WIDTH,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  bar: {
    width: BAR_WIDTH,
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#72AF5B',
  },
});
