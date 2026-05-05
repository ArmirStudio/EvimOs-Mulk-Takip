import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { formatCurrencyInput } from '../../utils/propertyHelpers';

interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onValueChange: (value: string) => void;
  /** Opsiyonel olarak özel stiller geçilebilir, aksi takdirde varsayılan stiller uygulanır */
  inputStyle?: any;
}

/**
 * Para birimi girişi için ortak bileşen.
 * Binlik ayracı (nokta) otomatik ekler ve sadece rakam kabul eder.
 * "Fazla kod yazma, her yerde aynı bloğu kullan" prensibiyle oluşturulmuştur.
 */
export const CurrencyInput = React.forwardRef<TextInput, CurrencyInputProps>(({
  value,
  onValueChange,
  inputStyle,
  placeholder = '0',
  ...props
}, ref) => {
  return (
    <TextInput
      {...props}
      ref={ref}
      style={[inputStyle]}
      placeholder={placeholder}
      placeholderTextColor={props.placeholderTextColor || '#999'}
      value={value ? formatCurrencyInput(String(value)) : ''}
      onChangeText={(text) => {
        // Sadece rakamları al
        const digits = text.replace(/[^0-9]/g, '');
        onValueChange(digits);
      }}
      keyboardType="numeric"
    />
  );
});

CurrencyInput.displayName = 'CurrencyInput';
