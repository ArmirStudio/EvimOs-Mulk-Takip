import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import BrandLockup from '../components/Shared/BrandLockup';
import { brand, landingHighlights, landingProof, landingRoles, publicSurface } from '../constants/brand';
import { createThemedStyles, useAppTheme } from './theme';
import { isSupabaseConfigured, supabaseConfigurationErrorMessage } from '../services/supabase';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function LandingScreen() {
  const [loading, setLoading] = useState(true);
  const theme = useAppTheme();
  const styles = useStyles();

  useEffect(() => {
    void checkExistingAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkExistingAuth = async () => {
    try {
      if (!isSupabaseConfigured) {
        await AsyncStorage.removeItem('user_data');
        return;
      }

      const userStr = await AsyncStorage.getItem('user_data');
      if (userStr) {
        const user = JSON.parse(userStr);
        navigateBasedOnRole(user.role);
        return;
      }
    } catch {
      // Public surface should fail open if local session parsing breaks.
    } finally {
      setTimeout(() => setLoading(false), 420);
    }
  };

  const navigateBasedOnRole = (role: string) => {
    switch (role) {
      case 'admin':
        router.replace('/admin/dashboard');
        break;
      case 'agent':
      case 'employee':
        router.replace('/agent/dashboard');
        break;
      case 'landlord':
        router.replace('/landlord/dashboard');
        break;
      case 'tenant':
        router.replace('/tenant/dashboard');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingOrb} />
        <BrandLockup variant="mark" size="hero" align="center" />
        <Text style={styles.loadingWordmark}>{brand.fullName}</Text>
        <Text style={styles.loadingSubtitle}>{brand.tagline}</Text>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loadingSpinner} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.duration(480)} style={styles.heroShell}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{brand.heroEyebrow}</Text>
            </View>
            <BrandLockup size="hero" variant="logo" showSubtitle align="left" />
            <Text style={styles.heroTitle}>{brand.heroTitle}</Text>
            <Text style={styles.heroSubtitle}>{brand.heroSubtitle}</Text>

            <View style={styles.proofChipRow}>
              {landingProof.map((item) => (
                <View key={item.label} style={styles.proofChip}>
                  <Text style={styles.proofChipLabel}>{item.label}</Text>
                  <Text style={styles.proofChipValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(90).duration(480)} style={styles.section}>
          <Text style={styles.sectionEyebrow}>Neyi toparlar?</Text>
          <Text style={styles.sectionTitle}>
            Günlük mülk operasyonları için daha net bir başlangıç katmanı.
          </Text>
          <View style={styles.cardList}>
            {landingHighlights.map((item) => (
              <InfoCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).duration(480)} style={styles.section}>
          <Text style={styles.sectionEyebrow}>Kimler için?</Text>
          <View style={styles.roleGrid}>
            {landingRoles.map((item) => (
              <RoleCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).duration(480)} style={styles.section}>
          <View style={styles.readinessPanel}>
            <Text style={styles.readinessTitle}>Evimos neyi görünür kılar?</Text>
            <Text style={styles.readinessBody}>
              Hangi kayıt bekliyor, hangi talep kapanıyor ve hangi kullanıcı hangi aşamada, public
              yüzeyden itibaren aynı tasarım dili içinde anlaşılır hale gelir.
            </Text>
            <View style={styles.readinessList}>
              {landingProof.map((item) => (
                <View key={item.label} style={styles.readinessRow}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.textInverse} />
                  <View style={styles.readinessCopy}>
                    <Text style={styles.readinessLabel}>{item.label}</Text>
                    <Text style={styles.readinessValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(480)} style={styles.ctaSection}>
          {!isSupabaseConfigured && supabaseConfigurationErrorMessage ? (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={20} color={theme.colors.warningText} />
              <Text style={styles.warningText}>{supabaseConfigurationErrorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, !isSupabaseConfigured && styles.primaryButtonDisabled]}
            onPress={() => router.push('/login')}
            disabled={!isSupabaseConfigured}
            activeOpacity={0.9}
            accessibilityLabel="Giriş ekranına git"
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Giriş Yap</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.textInverse} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, !isSupabaseConfigured && styles.primaryButtonDisabled]}
            onPress={() => router.push('/register' as never)}
            disabled={!isSupabaseConfigured}
            activeOpacity={0.9}
            accessibilityLabel="Kayıt ekranına git"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Kayıt Ol</Text>
            <Ionicons name="key-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.ctaFootnote}>{brand.loginHelper}</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  const theme = useAppTheme();
  const styles = useStyles();

  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDescription}>{description}</Text>
      </View>
    </View>
  );
}

function RoleCard({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  const theme = useAppTheme();
  const styles = useStyles();

  return (
    <View style={styles.roleCard}>
      <View style={styles.roleIconWrap}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <Text style={styles.roleTitle}>{title}</Text>
      <Text style={styles.roleDescription}>{description}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl + theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      gap: theme.spacing.sm,
    },
    loadingOrb: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: publicSurface.heroTint,
    },
    loadingWordmark: {
      maxWidth: 320,
      fontSize: 26,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.primary,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
    loadingSubtitle: {
      maxWidth: 300,
      fontSize: theme.fontSize.sm,
      lineHeight: 18,
      color: publicSurface.warmText,
      fontWeight: theme.fontWeight.semibold,
      textAlign: 'center',
    },
    loadingSpinner: {
      marginTop: theme.spacing.lg,
    },
    heroShell: {
      position: 'relative',
    },
    heroGlowLarge: {
      position: 'absolute',
      top: 24,
      right: 0,
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor: publicSurface.heroTint,
    },
    heroGlowSmall: {
      position: 'absolute',
      left: 12,
      bottom: 22,
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: publicSurface.accentSoft,
      opacity: 0.85,
    },
    heroCard: {
      backgroundColor: publicSurface.heroPanel,
      borderRadius: theme.borderRadius.xl + 10,
      borderWidth: 1,
      borderColor: publicSurface.panelBorder,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.lg,
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      backgroundColor: publicSurface.chipBg,
      borderRadius: 999,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    heroBadgeText: {
      fontSize: theme.fontSize.sm,
      color: publicSurface.chipText,
      fontWeight: theme.fontWeight.semibold,
    },
    heroTitle: {
      fontSize: 30,
      lineHeight: 38,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.bold,
      maxWidth: 320,
    },
    heroSubtitle: {
      fontSize: theme.fontSize.base,
      lineHeight: 24,
      color: theme.colors.textSecondary,
      maxWidth: 330,
    },
    proofChipRow: {
      gap: theme.spacing.md,
    },
    proofChip: {
      backgroundColor: publicSurface.panel,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: publicSurface.panelBorder,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    proofChipLabel: {
      fontSize: theme.fontSize.sm,
      color: publicSurface.warmText,
      fontWeight: theme.fontWeight.semibold,
    },
    proofChipValue: {
      fontSize: theme.fontSize.md,
      lineHeight: 20,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
    },
    section: {
      gap: theme.spacing.md,
    },
    sectionEyebrow: {
      fontSize: theme.fontSize.sm,
      color: publicSurface.warmText,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    sectionTitle: {
      fontSize: 24,
      lineHeight: 30,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.bold,
      maxWidth: 330,
    },
    cardList: {
      gap: theme.spacing.md,
    },
    infoCard: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      alignItems: 'flex-start',
      backgroundColor: publicSurface.panel,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: publicSurface.panelBorder,
      padding: theme.spacing.lg,
      ...theme.shadows.sm,
    },
    infoIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: publicSurface.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    infoTitle: {
      fontSize: theme.fontSize.lg,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.semibold,
    },
    infoDescription: {
      fontSize: theme.fontSize.md,
      lineHeight: 21,
      color: theme.colors.textSecondary,
    },
    roleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    roleCard: {
      width: '47%',
      backgroundColor: publicSurface.panel,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: publicSurface.panelBorder,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    roleIconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.md,
      backgroundColor: publicSurface.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleTitle: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.semibold,
    },
    roleDescription: {
      fontSize: theme.fontSize.sm,
      lineHeight: 19,
      color: theme.colors.textSecondary,
    },
    readinessPanel: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.xl + 8,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    readinessTitle: {
      fontSize: 24,
      lineHeight: 30,
      color: theme.colors.textInverse,
      fontWeight: theme.fontWeight.bold,
      maxWidth: 280,
    },
    readinessBody: {
      fontSize: theme.fontSize.md,
      lineHeight: 22,
      color: 'rgba(255,255,255,0.84)',
    },
    readinessList: {
      gap: theme.spacing.md,
    },
    readinessRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      alignItems: 'flex-start',
    },
    readinessCopy: {
      flex: 1,
      gap: 2,
    },
    readinessLabel: {
      fontSize: theme.fontSize.sm,
      color: 'rgba(255,255,255,0.72)',
      fontWeight: theme.fontWeight.semibold,
    },
    readinessValue: {
      fontSize: theme.fontSize.md,
      lineHeight: 21,
      color: theme.colors.textInverse,
      fontWeight: theme.fontWeight.medium,
    },
    ctaSection: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    warningCard: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.warningLight,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'flex-start',
    },
    warningText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      lineHeight: 18,
      color: theme.colors.warningText,
      fontWeight: theme.fontWeight.medium,
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xxl,
      ...theme.shadows.md,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
      letterSpacing: 0.2,
    },
    secondaryButton: {
      minHeight: 56,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
      backgroundColor: publicSurface.panel,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xxl,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
      letterSpacing: 0.2,
    },
    ctaFootnote: {
      fontSize: theme.fontSize.sm,
      lineHeight: 19,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
  }),
);
