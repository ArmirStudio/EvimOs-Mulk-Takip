import React, { useState, useRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { formatDecimalInput } from '../../utils/propertyHelpers';

interface DecimalCurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onValueChange: (rawValue: string) => void;
  inputStyle?: any;
}

/**
 * Ondalıklı para birimi girişi.
 * Binlik ayracı (nokta) + ondalık (virgül) otomatik formatlar.
 * "1250.50" → gösterim: "1.250,50", parent'a: "1250.50"
 */
export const DecimalCurrencyInput = React.forwardRef<TextInput, DecimalCurrencyInputProps>(({
  value,
  onValueChange,
  inputStyle,
  placeholder = '0,00',
  ...props
}, ref) => {
  const [display, setDisplay] = useState(() => {
    if (!value) return '';
    const { display: d } = formatDecimalInput(value.replace('.', ','));
    return d;
  });

  const isInternalChange = useRef(false);

  React.useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (!value) {
      setDisplay('');
    } else {
      const { display: d } = formatDecimalInput(value.replace('.', ','));
      setDisplay(d);
    }
  }, [value]);

  return (
    <TextInput
      {...props}
      ref={ref}
      style={[inputStyle]}
      placeholder={placeholder}
      placeholderTextColor={props.placeholderTextColor || '#999'}
      value={display}
      onChangeText={(text) => {
        isInternalChange.current = true;
        const { display: d, raw } = formatDecimalInput(text);
        setDisplay(d);
        onValueChange(raw);
      }}
      keyboardType="decimal-pad"
    />
  );
});

DecimalCurrencyInput.displayName = 'DecimalCurrencyInput';
