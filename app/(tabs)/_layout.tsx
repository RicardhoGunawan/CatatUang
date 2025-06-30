import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, BackHandler, ToastAndroid } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

export default function TabsLayout() {
  const router = useRouter();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const currentTabRef = useRef('index');
  const backPressCountRef = useRef(0);

  // Track current active tab
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      const state = e.data.state;
      if (state?.routes?.[state.index]?.state?.routes) {
        const currentRoute = state.routes[state.index].state;
        if (currentRoute && currentRoute.routes && typeof currentRoute.index === 'number') {
          const tabName = currentRoute.routes[currentRoute.index]?.name;
          if (tabName) {
            currentTabRef.current = tabName;
          }
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      const currentTab = currentTabRef.current;
      
      // If currently on index tab, implement double back to exit
      if (currentTab === 'index') {
        if (backPressCountRef.current === 0) {
          backPressCountRef.current = 1;
          
          // Show toast message
          if (Platform.OS === 'android') {
            ToastAndroid.show('Tekan sekali lagi untuk keluar aplikasi', ToastAndroid.SHORT);
          }
          
          // Reset counter after 2 seconds
          setTimeout(() => {
            backPressCountRef.current = 0;
          }, 2000);
          
          return true; // Prevent default back behavior
        } else {
          // Second back press - exit app
          BackHandler.exitApp();
          return false;
        }
      }
      
      // If on other tabs, go back to index tab
      router.push('/(tabs)');
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          height: 88,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MaterialIcons name="home" size={focused ? 26 : 24} color={color} />
            </View>
          ),
        }}
      />

      {/* Transactions Tab */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Aktivitas',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MaterialIcons name="receipt-long" size={focused ? 26 : 24} color={color} />
            </View>
          ),
        }}
      />

      {/* Add Transaction - Floating Button */}
      <Tabs.Screen
        name="add-transaction"
        options={{
          title: '',
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.floatingButtonWrapper}>
              <View style={[styles.floatingButton, focused && styles.floatingButtonActive]}>
                <MaterialIcons name="add" size={32} color="#fff" />
              </View>
            </View>
          ),
          tabBarButton: (props) => {
            const filteredProps = Object.fromEntries(
              Object.entries(props).filter(([_, v]) => v !== null)
            );
            return (
              <View style={styles.floatingButtonTouchWrapper}>
                <TouchableOpacity {...filteredProps} activeOpacity={0.8}>
                  {props.children}
                </TouchableOpacity>
              </View>
            );
          },
        }}
      />

      {/* Wallets Tab */}
      <Tabs.Screen
        name="wallets"
        options={{
          title: 'Dompet',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MaterialIcons name="account-balance-wallet" size={focused ? 26 : 24} color={color} />
            </View>
          ),
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MaterialIcons name="person" size={focused ? 26 : 24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 35,
    height: 35,
    borderRadius: 17,
  },
  activeIconContainer: {
    backgroundColor: '#007AFF15',
  },
  floatingButtonWrapper: {
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonTouchWrapper: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    width: 75,
    height: 75,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 4,
    borderColor: '#fff',
  },
  floatingButtonActive: {
    backgroundColor: '#0056CC',
    transform: [{ scale: 1.1 }],
  },
});