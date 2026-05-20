import { useEffect } from 'react';
import { ViewProps } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface SkeletonBoxProps extends ViewProps {
    width?: number | `${number}%`;
    height?: number;
    borderRadius?: number;
}

export function SkeletonBox({
    width,
    height = 16,
    borderRadius = 8,
    style,
    ...props
}: SkeletonBoxProps) {
    const opacity = useSharedValue(0.35);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 700 }),
                withTiming(0.35, { duration: 700 })
            ),
            -1
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    backgroundColor: '#E5E7EB',
                    borderRadius,
                    width: width as any,
                    height,
                },
                animatedStyle,
                style,
            ]}
            {...props}
        />
    );
}
