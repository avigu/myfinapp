import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/styles';
import ApiService from '../services/api';

const StockCard = ({ stock, rank, type }) => {
  const { ticker, change, priceBeforeEarnings, priceNow, marketCap, earningsDate } = stock;

  const handleViewDetails = () => {
    const url = `https://finance.yahoo.com/quote/${ticker}`;
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  const getChangeColor = () => {
    if (change >= 5) return Colors.success;
    if (change <= -5) return Colors.danger;
    return change >= 0 ? Colors.success : Colors.danger;
  };

  const getTypeColor = () => {
    return type === 'gainer' ? Colors.gainer : Colors.loser;
  };

  return (
    <View style={[styles.card, { borderLeftColor: getTypeColor() }]}>
      <View style={styles.header}>
        <View style={[styles.rankBadge, { backgroundColor: getTypeColor() }]}>
          <Text style={styles.rankText}>#{rank}</Text>
        </View>
        <View style={styles.tickerInfo}>
          <Text style={styles.ticker}>{ticker}</Text>
          {earningsDate && (
            <Text style={styles.earningsDate}>📅 {earningsDate}</Text>
          )}
        </View>
      </View>

      <View style={styles.priceInfo}>
        <View style={styles.changeContainer}>
          <Text style={[styles.change, { color: getChangeColor() }]}>
            {ApiService.formatChange(change)}
          </Text>
        </View>
        
        <View style={styles.priceDetails}>
          <View style={styles.priceRow}>
            <Text style={styles.label}>Before:</Text>
            <Text style={styles.value}>{ApiService.formatPrice(priceBeforeEarnings)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.label}>Current:</Text>
            <Text style={[styles.value, styles.currentPrice]}>{ApiService.formatPrice(priceNow)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.marketCapRow}>
        <Text style={styles.label}>Market Cap:</Text>
        <Text style={styles.value}>{ApiService.formatMarketCap(marketCap)}</Text>
      </View>

      <TouchableOpacity style={styles.actionButton} onPress={handleViewDetails}>
        <Text style={styles.actionButtonText}>📊 View Details</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderLeftWidth: 3,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rankBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
  },
  rankText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tickerInfo: {
    flex: 1,
  },
  ticker: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  earningsDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  priceInfo: {
    marginBottom: Spacing.sm,
  },
  changeContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  change: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  priceDetails: {
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketCapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  currentPrice: {
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default StockCard; 