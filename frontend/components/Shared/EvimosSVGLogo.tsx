import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface EvimOsSVGLogoProps {
  size?: number;
  variant?: 'full' | 'icon' | 'text-only';
  isDarkMode?: boolean;
}

const logoSource = require('../../assets/images/logo.png');
const markSource = require('../../assets/images/evimos-mark.png');
const LOGO_ASPECT = 420 / 1400;
const subtitle = 'M\u00fclk Y\u00f6netim';

export const EvimosSVGLogo: React.FC<EvimOsSVGLogoProps> = ({
  size = 200,
  variant = 'full',
  isDarkMode = false,
}) => {
  const textColor = isDarkMode ? '#FDF9F3' : '#087044';
  const subtitleColor = '#C1834F';

  if (variant === 'text-only') {
    return (
      <View style={[styles.textOnly, { width: size }]}>
        <Text style={[styles.title, { color: textColor, fontSize: size * 0.16 }]}>EvimOs</Text>
        <Text style={[styles.subtitle, { color: subtitleColor, fontSize: size * 0.06 }]}>{subtitle}</Text>
      </View>
    );
  }

  if (variant === 'icon') {
    return (
      <Image
        source={markSource}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessibilityLabel="EvimOs"
      />
    );
  }

  return (
    <Image
      source={logoSource}
      style={{ width: size, height: size * LOGO_ASPECT }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessibilityLabel="EvimOs Mulk Yonetim"
    />
  );
};

const styles = StyleSheet.create({
  textOnly: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    fontWeight: '600',
    marginTop: 2,
  },
});
