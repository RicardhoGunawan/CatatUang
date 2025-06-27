import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

interface TransactionModalProps {
  visible: boolean;
  type: 'loading' | 'success' | 'error';
  title: string;
  message: string;
  onClose?: () => void;
  buttonText?: string;
  progress?: number; // 0-100 untuk loading progress
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  buttonText = 'OK',
  progress = 0
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  
  const circleRadius = 35;
  const circleCircumference = 2 * Math.PI * circleRadius;

  useEffect(() => {
    if (visible) {
      // Scale animation saat modal muncul
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (type === 'loading') {
      // Spinning animation untuk loading
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 100,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();

      return () => {
        spinAnimation.stop();
        spinValue.setValue(0);
      };
    }
  }, [type]);

  useEffect(() => {
    if (type === 'loading' && progress > 0) {
      // Progress animation
      Animated.timing(progressValue, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, type]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const strokeDashoffset = progressValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circleCircumference, 0],
  });

  const getCircularProgress = () => {
    if (type === 'loading') {
      return (
        <View style={styles.progressContainer}>
          <Svg width="80" height="80" style={styles.svgContainer}>
            {/* Background circle */}
            <Circle
              cx="40"
              cy="40"
              r={circleRadius}
              stroke="#E0E0E0"
              strokeWidth="4"
              fill="transparent"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx="40"
              cy="40"
              r={circleRadius}
              stroke="#2196F3"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 40 40)`}
            />
          </Svg>
          <Animated.View 
            style={[
              styles.iconContainer,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <Ionicons name="sync" size={24} color="#2196F3" />
          </Animated.View>
          {progress > 0 && (
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          )}
        </View>
      );
    }

    // Success or Error icon
    const isSuccess = type === 'success';
    return (
      <View style={[
        styles.statusIconContainer,
        { backgroundColor: isSuccess ? '#E8F5E8' : '#FFF0F0' }
      ]}>
        <Ionicons
          name={isSuccess ? 'checkmark-circle' : 'close-circle'}
          size={60}
          color={isSuccess ? '#4CAF50' : '#F44336'}
        />
      </View>
    );
  };

  const shouldShowButton = type !== 'loading' && onClose;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ scale: scaleValue }] }
          ]}
        >
          {/* Progress/Status Indicator */}
          {getCircularProgress()}

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Button - hanya tampil jika bukan loading */}
          {shouldShowButton && (
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: type === 'success' ? '#4CAF50' : '#F44336' }
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{buttonText}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  progressContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  svgContainer: {
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 80,
  },
  progressText: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    top: 45,
  },
  statusIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 120,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default TransactionModal;