import React, { useState, useEffect } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChangeValue: (value: number) => void;
}

export function CurrencyInput({ value, onChangeValue, className, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numericValue)) {
        setDisplayValue(formatAsCurrency(numericValue));
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const formatAsCurrency = (num: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, '');
    
    if (!rawValue) {
      onChangeValue(0);
      setDisplayValue('');
      return;
    }

    const numericValue = parseInt(rawValue, 10) / 100;
    onChangeValue(numericValue);
    setDisplayValue(formatAsCurrency(numericValue));
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
