import React from 'react';
import { render } from '@testing-library/react';
import UnifiedStockCard from '../components/UnifiedStockCard';

describe('UnifiedStockCard', () => {
  it('displays ticker and current price', () => {
    const stock = {
      ticker: 'AAPL',
      change: 1.23,
      priceBeforeEarnings: 100,
      priceNow: 110,
      marketCap: 2000000000
    };

    const { getByText } = render(
      <UnifiedStockCard stock={stock} rank={1} type="gainer" />
    );

    expect(getByText('AAPL')).toBeInTheDocument();
    expect(getByText('$110.00')).toBeInTheDocument();
  });
});
