import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/styles';

const TabBar = ({ activeTab, onTabChange, tabs }) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab, 
            activeTab === tab.key && styles.activeTab
          ]}
          onPress={() => onTabChange(tab.key)}
        >
          <Text style={[
            styles.tabText, 
            activeTab === tab.key && styles.activeTabText
          ]}>
            {tab.title}
          </Text>
          <Text style={[
            styles.tabCount,
            activeTab === tab.key && styles.activeTabCount
          ]}>
            ({tab.count})
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGray,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    flexWrap: 'wrap',
  },
  activeTabText: {
    color: Colors.white,
    fontWeight: '600',
  },
  tabCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 10,
  },
  activeTabCount: {
    color: Colors.white,
  },
});

export default TabBar; 