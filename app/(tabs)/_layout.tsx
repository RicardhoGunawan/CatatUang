import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, BackHandler, Alert } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

export default function TabsLayout() {
  const router = useRouter();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const tabHistoryRef = useRef<string[]>(['index']); // Start with index as first tab
  const currentTabRef = useRef<string>('index');

  // Function to add tab to history
  const addToHistory = (tabName: string) => {
    const history = tabHistoryRef.current;
    
    // Don't add if it's the same as current tab
    if (history[history.length - 1] === tabName) return;
    
    // Add new tab to history
    history.push(tabName);
    
    // Keep only last 10 tabs to prevent memory issues
    if (history.length > 10) {
      tabHistoryRef.current = history.slice(-10);
    }
    
    currentTabRef.current = tabName;
    
    console.log('Tab History:', tabHistoryRef.current); // Debug log
  };

  useEffect(() => {
    // Listener untuk track tab changes
    const unsubscribe = navigation.addListener('state', (e) => {
      const state = e.data.state;
      if (state && state.routes && state.routes[state.index]) {
        const currentRoute = state.routes[state.index];
        if (currentRoute.state && currentRoute.state.routes && currentRoute.state.index !== undefined) {
          const currentTab = currentRoute.state.routes[currentRoute.state.index].name;
          
          // Update current tab reference
          currentTabRef.current = currentTab;
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const backAction = () => {
      const currentTab = currentTabRef.current;
      const tabHistory = [...tabHistoryRef.current]; // Create copy
      
      console.log('Back pressed. Current tab:', currentTab);
      console.log('Current history:', tabHistory);

      // If we're at index and it's the only item in history, show logout dialog
      if (currentTab === 'index' && tabHistory.length === 1) {
        Alert.alert(
          'Keluar Aplikasi',
          'Apakah Anda yakin ingin keluar dari aplikasi?',
          [
            {
              text: 'Batal',
              onPress: () => null,
              style: 'cancel',
            },
            {
              text: 'Ya, Keluar',
              onPress: async () => {
                try {
                  await logout();
                  router.replace('/login');
                } catch (error) {
                  console.error('Logout error:', error);
                  router.replace('/login');
                }
              },
            },
          ]
        );
        return true;
      }

      // If we have history to go back to
      if (tabHistory.length > 1) {
        // Remove current tab from history
        tabHistory.pop();
        
        // Get previous tab
        const previousTab = tabHistory[tabHistory.length - 1];
        
        // Update history
        tabHistoryRef.current = tabHistory;
        currentTabRef.current = previousTab;
        
        console.log('Going back to:', previousTab);
        console.log('New history:', tabHistoryRef.current);
        
        // Navigate to previous tab
        switch (previousTab) {
          case 'index':
            router.push('/(tabs)');
            break;
          case 'transactions':
            router.push('/(tabs)/transactions');
            break;
          case 'add-transaction':
            router.push('/(tabs)/add-transaction');
            break;
          case 'wallets':
            router.push('/(tabs)/wallets');
            break;
          case 'profile':
            router.push('/(tabs)/profile');
            break;
          default:
            router.push('/(tabs)');
            break;
        }
        return true;
      }

      // Default behavior for edge cases
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router, logout]);

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
        listeners={{
          tabPress: () => {
            addToHistory('index');
          },
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
        listeners={{
          tabPress: () => {
            addToHistory('transactions');
          },
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
                <TouchableOpacity {...filteredProps} activeOpacity={0.8}>
                  {props.children}
                </TouchableOpacity>
              </View>
            );
          },
        }}
        listeners={{
          tabPress: () => {
            addToHistory('add-transaction');
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
        listeners={{
          tabPress: () => {
            addToHistory('wallets');
          },
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
        listeners={{
          tabPress: () => {
            addToHistory('profile');
          },
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