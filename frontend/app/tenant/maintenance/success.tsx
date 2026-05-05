import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { createThemedStyles, useAppTheme } from '../../theme';
import { tr } from '../../translations';

export default function MaintenanceSuccessScreen() {
  useAppTheme();
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Animated.View entering={ZoomIn.duration(600)} style={styles.iconCircle}>
          <MaterialIcons name="check" size={60} color="white" />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(600)} style={styles.textContainer}>
          <Text style={styles.title}>{tr.maintenance.successTitle}</Text>
          <Text style={styles.subtitle}>{tr.maintenance.successSubtitle}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/tenant/dashboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{tr.maintenance.returnToDashboard}</Text>
            <MaterialIcons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    ...theme.shadows.lg,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    width: '100%',
  },
  button: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    ...theme.shadows.md,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
}));
