import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import DateSelector from '../components/DateSelector';

describe('DateSelector', () => {
  it('calls onDateChange when date is changed', () => {
    const handleChange = jest.fn();
    const { getByLabelText } = render(
      <DateSelector selectedDate="2023-01-01" onDateChange={handleChange} />
    );

    fireEvent.change(getByLabelText(/Analysis Date/i), {
      target: { value: '2023-01-02' }
    });

    expect(handleChange).toHaveBeenCalledWith('2023-01-02');
  });
});
