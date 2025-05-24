import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'trending-up' : 'trending-up-outline';
            } else if (route.name === 'Earnings') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTintColor: '#000',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{
            title: '📈 MyFinApp',
            headerTitle: 'MyFinApp',
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: 'bold',
            }
          }}
        />
        <Tab.Screen 
          name="Earnings" 
          component={EarningsScreen}
          options={{
            title: '📅 Earnings',
            headerTitle: 'Earnings Calendar',
            headerTitleStyle: {
              fontSize: 16,
              fontWeight: 'bold',
            }
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            title: '⚙️ Settings',
            headerTitle: 'Settings',
            headerTitleStyle: {
              fontSize: 16,
              fontWeight: 'bold',
            }
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
