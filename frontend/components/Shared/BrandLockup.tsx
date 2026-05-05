import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { brand, publicSurface } from '../../constants/brand';
import { createThemedStyles, useAppTheme } from '../../app/theme';

const logoSource = require('../../assets/images/logo.png');
const markSource = require('../../assets/images/evimos-mark.png');

const LOGO_ASPECT = 420 / 1400;

type BrandLockupProps = {
  align?: 'left' | 'center';
  tone?: 'default' | 'inverse';
  showSubtitle?: boolean;
  variant?: 'logo' | 'mark';
  size?: 'hero' | 'section' | 'compact';
};

const SIZE_MAP = {
  hero: { logoWidth: 232, markSize: 96, subtitleWidth: 268 },
  section: { logoWidth: 200, markSize: 78, subtitleWidth: 224 },
  compact: { logoWidth: 168, markSize: 60, subtitleWidth: 196 },
} as const;

export default function BrandLockup({
  align = 'left',
  tone = 'default',
  showSubtitle = false,
  variant = 'logo',
  size = 'section',
}: BrandLockupProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const metrics = SIZE_MAP[size];
  const isInverse = tone === 'inverse';
  const subtitleColor = isInverse ? theme.colors.textInverse : publicSurface.warmText;
  const alignmentStyle = align === 'center' ? styles.center : styles.left;

  return (
    <View style={[styles.root, alignmentStyle]}>
      {variant === 'logo' ? (
        <Image
          source={logoSource}
          style={{
            width: metrics.logoWidth,
            height: metrics.logoWidth * LOGO_ASPECT,
          }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel={brand.fullName}
        />
      ) : (
        <Image
          source={markSource}
          style={{ width: metrics.markSize, height: metrics.markSize }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel={brand.appName}
        />
      )}
      {showSubtitle ? (
        <Text
          style={[
            styles.subtitle,
            { color: subtitleColor, maxWidth: metrics.subtitleWidth },
            align === 'center' ? styles.subtitleCenter : null,
          ]}
        >
          {brand.heroFootnote}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    root: {
      gap: theme.spacing.sm,
    },
    left: {
      alignItems: 'flex-start',
    },
    center: {
      alignItems: 'center',
    },
    subtitle: {
      fontSize: theme.fontSize.sm,
      lineHeight: 19,
      fontWeight: theme.fontWeight.medium,
    },
    subtitleCenter: {
      textAlign: 'center',
    },
  }),
);
