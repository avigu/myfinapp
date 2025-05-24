import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Linking,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/styles';
import ApiService from '../services/api';

const SettingsScreen = () => {
  const [selectedDate, setSelectedDate] = useState(ApiService.getCurrentDate());

  const handleLinkPress = (url, title) => {
    Alert.alert(
      'Open External Link',
      `This will open ${title} in your browser. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open', 
          onPress: () => Linking.openURL(url).catch(err => 
            console.error('Failed to open URL:', err)
          )
        }
      ]
    );
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDateChange = () => {
    // For now, we'll cycle between today and a few days back
    const today = new Date();
    const currentDate = new Date(selectedDate);
    
    if (currentDate.toDateString() === today.toDateString()) {
      // Go to yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      setSelectedDate(yesterday.toISOString().slice(0, 10));
    } else {
      // Go back to today
      setSelectedDate(today.toISOString().slice(0, 10));
    }
  };

  const SettingSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const SettingItem = ({ icon, title, subtitle, onPress, showArrow = true, value }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        )}
        {value && (
          <Text style={styles.settingValue}>{value}</Text>
        )}
      </View>
      {showArrow && (
        <Text style={styles.arrow}>›</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📈 MyFinApp</Text>
          <Text style={styles.headerSubtitle}>Mobile Edition</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        <SettingSection title="App Preferences">
          <SettingItem
            icon="📅"
            title="Data Date"
            subtitle="Select date for historical data"
            value={formatDisplayDate(selectedDate)}
            onPress={handleDateChange}
          />
          <SettingItem
            icon="🔄"
            title="Auto Refresh"
            subtitle="Automatically refresh data every 5 minutes"
            onPress={() => Alert.alert('Coming Soon', 'Auto refresh feature will be available in a future update.')}
          />
        </SettingSection>

        <SettingSection title="About">
          <SettingItem
            icon="📊"
            title="Real-time Market Data"
            subtitle="S&P 500 & NASDAQ investment opportunities"
            onPress={() => {}}
            showArrow={false}
          />
          <SettingItem
            icon="🏢"
            title="Earnings Calendar"
            subtitle="Track upcoming earnings reports"
            onPress={() => {}}
            showArrow={false}
          />
          <SettingItem
            icon="📈"
            title="Performance Tracking"
            subtitle="Monitor top gainers and losers"
            onPress={() => {}}
            showArrow={false}
          />
        </SettingSection>

        <SettingSection title="Data Sources">
          <SettingItem
            icon="🌐"
            title="Yahoo Finance"
            subtitle="Market data provider"
            onPress={() => handleLinkPress('https://finance.yahoo.com', 'Yahoo Finance')}
          />
          <SettingItem
            icon="📈"
            title="Finnhub"
            subtitle="Financial data API"
            onPress={() => handleLinkPress('https://finnhub.io', 'Finnhub')}
          />
        </SettingSection>

        <SettingSection title="Developer">
          <SettingItem
            icon="💻"
            title="View Source Code"
            subtitle="Open source on GitHub"
            onPress={() => handleLinkPress('https://github.com', 'GitHub Repository')}
          />
          <SettingItem
            icon="🌐"
            title="Web Version"
            subtitle="View the desktop web interface"
            onPress={() => handleLinkPress('http://localhost:3000', 'Web Version')}
          />
        </SettingSection>

        <SettingSection title="Legal">
          <SettingItem
            icon="📄"
            title="Privacy Policy"
            subtitle="How we handle your data"
            onPress={() => Alert.alert('Privacy Policy', 'This app does not collect or store any personal data. All market data is fetched directly from public APIs.')}
          />
          <SettingItem
            icon="⚖️"
            title="Terms of Service"
            subtitle="Usage terms and conditions"
            onPress={() => Alert.alert('Terms of Service', 'This app is provided as-is for informational purposes only. Not financial advice.')}
          />
          <SettingItem
            icon="⚠️"
            title="Disclaimer"
            subtitle="Important investment notice"
            onPress={() => Alert.alert('Investment Disclaimer', 'This app provides market information for educational purposes only. Always consult with a qualified financial advisor before making investment decisions.')}
          />
        </SettingSection>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Data powered by Yahoo Finance & Finnhub
          </Text>
          <Text style={styles.footerText}>
            Updated: {new Date().toLocaleString()}
          </Text>
          <Text style={styles.footerNote}>
            Market data may be delayed. Not for trading purposes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.cardBackground,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  version: {
    ...Typography.caption,
    color: Colors.textSecondary,
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.body,
    color: Colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  settingValue: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  arrow: {
    ...Typography.h2,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  footer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  footerNote: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
});

export default SettingsScreen; 