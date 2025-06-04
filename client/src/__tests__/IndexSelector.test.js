import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import IndexSelector from '../components/IndexSelector';

describe('IndexSelector', () => {
  it('calls onIndexChange when NASDAQ radio is clicked', () => {
    const handleChange = jest.fn();
    const { getByDisplayValue } = render(
      <IndexSelector selectedIndex="sp500" onIndexChange={handleChange} />
    );

    fireEvent.click(getByDisplayValue('nasdaq'));
    expect(handleChange).toHaveBeenCalledWith('nasdaq');
  });
});
