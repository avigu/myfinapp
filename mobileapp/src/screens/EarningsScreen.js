import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LoadingSpinner from '../components/LoadingSpinner';
import ErrorView from '../components/ErrorView';
import FilterControls from '../components/FilterControls';
import ApiService from '../services/api';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/styles';

const EarningsScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState('sp500');
  const [selectedDate, setSelectedDate] = useState(ApiService.getCurrentDate());

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const result = await ApiService.fetchStockData(selectedIndex, selectedDate);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedIndex, selectedDate]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeOfDay = (time) => {
    switch (time) {
      case 'bmo': return '🌅 Before Market';
      case 'amc': return '🌆 After Market';
      default: return '📊 During Market';
    }
  };

  const handleViewStock = (ticker) => {
    const url = `https://finance.yahoo.com/quote/${ticker}`;
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  const groupEarningsByDate = (earnings) => {
    if (!earnings || earnings.length === 0) return {};
    
    return earnings.reduce((groups, earning) => {
      const date = earning.date || earning.earningsDate;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(earning);
      return groups;
    }, {});
  };

  const renderEarningsItem = ({ item: company }) => (
    <View style={styles.earningsItem}>
      <View style={styles.companyInfo}>
        <Text style={styles.companyTicker}>
          {company.symbol || company.ticker}
        </Text>
        {company.companyName && (
          <Text style={styles.companyName} numberOfLines={2}>
            {company.companyName}
          </Text>
        )}
      </View>
      
      <View style={styles.earningsMeta}>
        {company.time && (
          <Text style={styles.earningsTime}>
            {getTimeOfDay(company.time)}
          </Text>
        )}
        
        {company.epsEstimate && (
          <Text style={styles.estimate}>
            EPS Est: ${company.epsEstimate}
          </Text>
        )}
        
        {company.revenueEstimate && (
          <Text style={styles.estimate}>
            Rev Est: ${company.revenueEstimate}
          </Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.viewButton}
        onPress={() => handleViewStock(company.symbol || company.ticker)}
      >
        <Text style={styles.viewButtonText}>📈 View</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDateSection = ({ item: [date, companies] }) => (
    <View style={styles.dateSection}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateTitle}>{formatDate(date)}</Text>
        <Text style={styles.companyCount}>({companies.length} companies)</Text>
      </View>
      
      <FlatList
        data={companies}
        renderItem={renderEarningsItem}
        keyExtractor={(item, index) => `${item.symbol || item.ticker}-${index}`}
        scrollEnabled={false}
      />
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>📅</Text>
      <Text style={styles.emptyTitle}>No upcoming earnings</Text>
      <Text style={styles.emptyMessage}>
        No earnings reports scheduled for the selected timeframe.
      </Text>
    </View>
  );

  if (loading) return <LoadingSpinner message="Loading earnings data..." />;
  if (error) return <ErrorView error={error} onRetry={() => fetchData()} />;

  const earnings = data?.upcomingEarnings || [];
  const groupedEarnings = groupEarningsByDate(earnings);
  const sortedEarnings = Object.entries(groupedEarnings)
    .sort(([a], [b]) => new Date(a) - new Date(b));

  return (
    <SafeAreaView style={styles.container}>
      <FilterControls
        selectedIndex={selectedIndex}
        onIndexChange={setSelectedIndex}
        onRefresh={handleRefresh}
      />

      <FlatList
        data={sortedEarnings}
        renderItem={renderDateSection}
        keyExtractor={([date]) => date}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContainer: {
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  dateSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dateHeader: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.sm,
  },
  dateTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  companyCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  earningsItem: {
    backgroundColor: Colors.cardBackground,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.sm,
  },
  companyInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  companyTicker: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  companyName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  earningsMeta: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  earningsTime: {
    ...Typography.caption,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  estimate: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  viewButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  viewButtonText: {
    color: Colors.white,
    ...Typography.caption,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default EarningsScreen; 