
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-elements';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';


export function AnimatedText({ text } : { text : string } ) {
  const rotationAnimation = useSharedValue(0);

  rotationAnimation.value = withRepeat(
    withSequence(withTiming(25, { duration: 150 }), withTiming(0, { duration: 150 })),
    4 // Run the animation 4 times
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationAnimation.value}deg` }],
  }));

    return (
        <Animated.View style={animatedStyle}>
            <Text style={ styles.text }>{ text }</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    text : {
        fontSize: 28,
        lineHeight: 32,
        marginTop: -12,
        textAlign: 'center'
    }
})