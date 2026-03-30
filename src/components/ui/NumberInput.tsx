import React, { useState, useEffect } from 'react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChangeValue: (value: number) => void;
  allowDecimals?: boolean;
}

export function NumberInput({ value, onChangeValue, allowDecimals = false, className, ...props }: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numericValue)) {
        setDisplayValue(formatAsNumber(numericValue));
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const formatAsNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: allowDecimals ? 2 : 0,
      maximumFractionDigits: allowDecimals ? 2 : 0,
    }).format(num);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, '');
    
    if (!rawValue) {
      onChangeValue(0);
      setDisplayValue('');
      return;
    }

    const numericValue = allowDecimals ? parseInt(rawValue, 10) / 100 : parseInt(rawValue, 10);
    onChangeValue(numericValue);
    setDisplayValue(formatAsNumber(numericValue));
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
}
