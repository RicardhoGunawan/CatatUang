import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

export default function TabsLayout() {
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
      {/* Tab 1 */}
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

      {/* Tab 2 */}
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

      {/* Floating Action Tab */}
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
            // Filter out any props with value null (e.g., disabled: null)
            const filteredProps = Object.fromEntries(
              Object.entries(props).filter(([_, v]) => v !== null)
            );
            return (
              <View style={styles.floatingButtonTouchWrapper}>
                {/* Bisa diganti TouchableOpacity kalau ingin animasi ripple */}
                <TouchableOpacity {...filteredProps} activeOpacity={0.8}>
                  {props.children}
                </TouchableOpacity>
              </View>
            );
          },
        }}
      />

      {/* Tab 4 */}
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

      {/* Tab 5 */}
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

import { TouchableOpacity } from 'react-native'; // tambahkan ini di atas kalau belum

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
