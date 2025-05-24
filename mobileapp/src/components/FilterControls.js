import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/styles';

const FilterControls = ({ 
  selectedIndex, 
  onIndexChange, 
  onRefresh 
}) => {
  const indexOptions = [
    { label: '📈 S&P 500', value: 'sp500' },
    { label: '💻 NASDAQ', value: 'nasdaq' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Index:</Text>
          <View style={styles.picker}>
            <RNPickerSelect
              onValueChange={onIndexChange}
              items={indexOptions}
              value={selectedIndex}
              placeholder={{}}
              style={pickerSelectStyles}
              useNativeAndroidPickerStyle={false}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  pickerContainer: {
    flex: 1,
  },
  picker: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  refreshButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minWidth: 100,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: Colors.white,
    ...Typography.body,
    fontWeight: '600',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    color: Colors.text,
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    paddingRight: 30,
  },
});

export default FilterControls; 