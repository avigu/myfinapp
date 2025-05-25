import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StockCard from '../components/StockCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorView from '../components/ErrorView';
import FilterControls from '../components/FilterControls';
import TabBar from '../components/TabBar';
import NetworkTest from '../components/NetworkTest';
import ApiService from '../services/api';
import { Colors, Spacing, Typography } from '../constants/styles';

const HomeScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState('sp500');
  const [selectedDate, setSelectedDate] = useState(ApiService.getCurrentDate());
  const [activeTab, setActiveTab] = useState('gainers');

  console.log('📱 [HomeScreen] Component rendered');
  console.log('📱 [HomeScreen] State:', { loading, error: !!error, dataKeys: data ? Object.keys(data) : 'null' });

  const fetchData = async (showLoading = true) => {
    console.log('📱 [HomeScreen] fetchData called, showLoading:', showLoading);
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      console.log('📱 [HomeScreen] Calling ApiService.fetchStockData...');
      
      // Add a race condition with timeout
      const fetchPromise = ApiService.fetchStockData(selectedIndex, selectedDate);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000)
      );
      
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      console.log('📱 [HomeScreen] API call successful, setting data');
      setData(result);
    } catch (err) {
      console.error('📱 [HomeScreen] API call failed:', err.message);
      setError(err.message);
    } finally {
      console.log('📱 [HomeScreen] fetchData finished');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('📱 [HomeScreen] useEffect triggered, calling fetchData');
    fetchData();
  }, [selectedIndex, selectedDate]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const getCurrentData = () => {
    if (!data) return [];
    
    switch (activeTab) {
      case 'gainers':
        return data.topGainers || [];
      case 'losers':
        return data.topLosers || [];
      case 'all':
        return data.opportunities || [];
      default:
        return [];
    }
  };

  const renderStockCard = ({ item, index }) => {
    let type = 'neutral';
    if (activeTab === 'gainers') type = 'gainer';
    else if (activeTab === 'losers') type = 'loser';
    else type = item.change >= 0 ? 'gainer' : 'loser';

    return (
      <StockCard 
        stock={item} 
        rank={index + 1} 
        type={type}
      />
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>📊</Text>
      <Text style={styles.emptyTitle}>No data available</Text>
      <Text style={styles.emptyMessage}>
        Try refreshing or selecting a different date/index.
      </Text>
    </View>
  );

  // Show error state with NetworkTest
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkTest />
        <ErrorView error={error} onRetry={() => fetchData()} />
      </SafeAreaView>
    );
  }

  // Show loading state with NetworkTest
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkTest />
        <LoadingSpinner message="Loading stock data..." />
      </SafeAreaView>
    );
  }

  const { topGainers = [], topLosers = [], opportunities = [] } = data || {};

  const tabs = [
    { key: 'gainers', title: '📈 Top Gainers', count: topGainers.length },
    { key: 'losers', title: '📉 Top Losers', count: topLosers.length },
    { key: 'all', title: '📊 All Opportunities', count: opportunities.length },
  ];

  const currentData = getCurrentData();

  return (
    <SafeAreaView style={styles.container}>
      <NetworkTest />
      
      <FilterControls
        selectedIndex={selectedIndex}
        onIndexChange={setSelectedIndex}
        onRefresh={handleRefresh}
      />
      
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      <FlatList
        data={currentData}
        renderItem={renderStockCard}
        keyExtractor={(item, index) => `${item.ticker}-${index}`}
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

export default HomeScreen; 