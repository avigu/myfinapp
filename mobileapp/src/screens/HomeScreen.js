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

  if (loading) return <LoadingSpinner message="Loading stock data..." />;
  if (error) return <ErrorView error={error} onRetry={() => fetchData()} />;

  const { topGainers = [], topLosers = [], opportunities = [] } = data || {};

  const tabs = [
    { key: 'gainers', title: '📈 Top Gainers', count: topGainers.length },
    { key: 'losers', title: '📉 Top Losers', count: topLosers.length },
    { key: 'all', title: '📊 All Opportunities', count: opportunities.length },
  ];

  const currentData = getCurrentData();

  return (
    <SafeAreaView style={styles.container}>
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