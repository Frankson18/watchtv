import { forwardRef } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

const ScalePressable = forwardRef<React.ComponentRef<typeof Pressable>, Props>(
  ({ style, scaleTo = 0.97, children, onPressIn, onPressOut, ...rest }, ref) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
      <AnimatedPressable
        ref={ref}
        {...rest}
        onPressIn={(e) => {
          scale.value = withTiming(scaleTo, { duration: 90 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withTiming(1, { duration: 150 });
          onPressOut?.(e);
        }}
        style={[style, animatedStyle]}
      >
        {children}
      </AnimatedPressable>
    );
  },
);

ScalePressable.displayName = "ScalePressable";

export default ScalePressable;
