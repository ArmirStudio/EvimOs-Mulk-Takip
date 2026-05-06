import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator,
  Modal, RefreshControl, Image,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { usePreferences, type Currency, type AppTheme } from '../../hooks/usePreferences';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme, useThemeController } from '../../app/theme';
import { tr } from '../../app/translations';
import { useUserData, signOut } from '../../hooks/useUserData';
import { appApi, listUsers, updateUser } from '../../services/appApi';
import { mapPreferenceToBackendTheme } from '../../services/preferences';
import AnimatedHeaderScrollView from './AnimatedHeaderScrollView';
import AnimatedScreen from './AnimatedScreen';
import { EvimosSVGLogo } from './EvimosSVGLogo';
import { brand } from '../../constants/brand';

const ROLE_LABELS: Record<string, string> = {
  agent:    'Emlakçı',
  landlord: 'Ev Sahibi',
  tenant:   'Kiracı',
  employee: 'Çalışan',
  technician: 'Usta',
};

type DirectoryFilter = 'all' | 'technician' | 'landlord' | 'tenant';

type DirectoryItem = {
  id: string;
  kind: 'user' | 'technician';
  role: 'landlord' | 'tenant' | 'technician';
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profession?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

function getRoleColor(theme: ReturnType<typeof useAppTheme>, role: string): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    agent: { bg: theme.colors.primaryLight, text: theme.colors.primary },
    landlord: { bg: theme.colors.warningLight, text: theme.colors.warningText },
    tenant: { bg: theme.colors.infoLight, text: theme.colors.infoText },
    employee: { bg: theme.colors.successLight, text: theme.colors.successText },
    technician: { bg: theme.colors.primaryLight, text: theme.colors.primary },
  };
  return colors[role] ?? colors.tenant;
}

const getInitials = (name: string): string =>
  name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

const TERMS_TEXT = `Bu uygulamayı kullanarak aşağıdaki kullanım şartlarını kabul etmiş sayılırsınız.

1. Uygulama, mülk yönetimi amacıyla kullanılmak üzere tasarlanmıştır.
2. Kullanıcı bilgilerinin gizliliği korunmaktadır.
3. Uygulama üzerinden yapılan işlemler kayıt altına alınmaktadır.
4. Yetkisiz kullanım yasaktır ve yasal işlem başlatılabilir.

Daha fazla bilgi için destek ekibimizle iletişime geçin.`;

const PRIVACY_TEXT = `Gizlilik Politikası

Kişisel verileriniz KVKK kapsamında korunmaktadır. Toplanan veriler yalnızca uygulama hizmetlerinin sunulması amacıyla kullanılır ve üçüncü taraflarla paylaşılmaz.

Verilerinizin silinmesini talep etmek için destek ekibimizle iletişime geçebilirsiniz.`;

export default function SettingsScreen() {
  const { userData, reload } = useUserData();
  const theme = useAppTheme();
  const { preference, setPreference } = useThemeController();
  const s = useStyles();
  const role = userData?.role ?? 'tenant';
  const isAgent = role === 'agent';
  const routeRole = role === 'employee' ? 'agent' : role;
  const roleColor = getRoleColor(theme, role);
  const isDarkMode = theme.colors.background === theme.colors.dark;

  const [activeTab, setActiveTab] = useState<'profile' | 'directory'>('profile');

  const { prefs, updateCurrency } = usePreferences();
  const [savingPreference, setSavingPreference] = useState<null | 'currency' | 'theme'>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackOpacity = useSharedValue(0);
  const feedbackScale = useSharedValue(0.92);

  const [legalModal, setLegalModal] = useState<null | 'terms' | 'privacy'>(null);

  const [contacts, setContacts] = useState<DirectoryItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactFilter, setContactFilter] = useState<DirectoryFilter>('all');
  const [contactSort, setContactSort] = useState<'newest' | 'name'>('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const [landlords, tenants, technicians] = await Promise.all([
        listUsers({ role: 'landlord' }),
        listUsers({ role: 'tenant' }),
        appApi.listOfficeContacts(),
      ]);
      setContacts([
        ...(landlords.users || []).map((item: any) => ({ ...item, kind: 'user' as const, role: 'landlord' as const })),
        ...(tenants.users || []).map((item: any) => ({ ...item, kind: 'user' as const, role: 'tenant' as const })),
        ...(technicians.contacts || []).map((item: any) => ({ ...item, kind: 'technician' as const, role: 'technician' as const })),
      ]);
    } catch {
      Alert.alert(tr.common.error, tr.errors.loadFailed);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAgent && activeTab === 'directory') loadContacts();
  }, [activeTab, isAgent, loadContacts]);

  const displayContacts = useMemo(() => {
    let list = contactFilter === 'all'
      ? contacts
      : contacts.filter(c => c.role === contactFilter);
    if (contactSort === 'name') {
      list = [...list].sort((a, b) =>
        (a.full_name ?? '').localeCompare(b.full_name ?? '', 'tr')
      );
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }
    return list;
  }, [contacts, contactFilter, contactSort]);

  const feedbackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: feedbackOpacity.value,
    transform: [{ scale: feedbackScale.value }],
  }));

  const showSavedFeedback = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackOpacity.value = 0;
    feedbackScale.value = 0.92;
    feedbackOpacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(1, { duration: 1200 }),
      withTiming(0, { duration: 220 }),
    );
    feedbackScale.value = withSequence(
      withTiming(1.04, { duration: 180 }),
      withTiming(1, { duration: 220 }),
    );
    feedbackTimeoutRef.current = setTimeout(() => {
      feedbackOpacity.value = withTiming(0, { duration: 0 });
      feedbackScale.value = withTiming(0.92, { duration: 0 });
    }, 1700);
  }, [feedbackOpacity, feedbackScale]);

  const handleCurrencyChange = useCallback(async (nextCurrency: Currency) => {
    if (!userData?.id || savingPreference || prefs.currency === nextCurrency) {
      return;
    }

    const previousCurrency = prefs.currency;
    setSavingPreference('currency');
    await updateCurrency(nextCurrency);

    try {
      await updateUser(userData.id, {
        preferred_currency: nextCurrency,
      });
      await reload();
      showSavedFeedback();
    } catch {
      await updateCurrency(previousCurrency);
      Alert.alert(tr.common.error, tr.errors.saveFailed);
    } finally {
      setSavingPreference(null);
    }
  }, [prefs.currency, reload, savingPreference, showSavedFeedback, updateCurrency, userData?.id]);

  const handleThemeChange = useCallback(async (nextTheme: AppTheme) => {
    if (!userData?.id || savingPreference || preference === nextTheme) {
      return;
    }

    const previousTheme = preference;
    setSavingPreference('theme');
    await setPreference(nextTheme);

    try {
      await updateUser(userData.id, {
        preferred_theme: mapPreferenceToBackendTheme(nextTheme),
      });
      await reload();
      showSavedFeedback();
    } catch {
      await setPreference(previousTheme);
      Alert.alert(tr.common.error, tr.errors.saveFailed);
    } finally {
      setSavingPreference(null);
    }
  }, [preference, reload, savingPreference, setPreference, showSavedFeedback, userData?.id]);

  const handleSignOut = () => {
    Alert.alert(tr.auth.logout, tr.auth.logoutConfirm, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.auth.logout, style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  const renderSectionHeader = (title: string, badgeLabel?: string) => (
    <View style={s.sectionHeaderRow}>
      <Text style={s.sectionLabel}>{title}</Text>
      {badgeLabel || title.toLocaleLowerCase('tr').includes('bildir') ? (
        <Text style={s.comingSoonBadge}>{badgeLabel ?? 'Yakında'}</Text>
      ) : null}
    </View>
  );

  const renderMenuItem = (
    icon: string,
    label: string,
    onPress: () => void,
    rightEl?: React.ReactNode,
    danger?: boolean,
  ) => {
    const defaultRightEl = icon === 'description' || icon === 'privacy-tip'
      ? <MaterialIcons name="open-in-new" size={18} color={theme.colors.textMuted} />
      : <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />;

    return (
      <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
        <View style={[s.menuIconBg, danger && { backgroundColor: theme.colors.errorLight }]}>
          <MaterialIcons name={icon as any} size={20} color={danger ? theme.colors.error : theme.colors.primary} />
        </View>
        <Text style={[s.menuLabel, danger && { color: theme.colors.error }]}>{label}</Text>
        {rightEl ?? defaultRightEl}
      </TouchableOpacity>
    );
  };

  // ── TAB: Profil ───────────────────────────────────────────────────
  const renderProfileTab = () => (
    <View style={s.scrollContent}>

      {/* Avatar + Profil Kartı */}
      <TouchableOpacity
        style={s.profileCard}
        onPress={() => router.push(`/${routeRole}/profile-edit` as any)}
        activeOpacity={0.85}
      >
        {userData?.avatar_url ? (
          <Image source={{ uri: userData.avatar_url }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={s.avatarText}>{getInitials(userData?.full_name ?? '')}</Text>
          </View>
        )}
        <View style={s.profileInfo}>
          <Text style={s.profileName}>{userData?.full_name ?? '—'}</Text>
          <Text style={s.profileEmail} numberOfLines={1}>{userData?.email ?? '—'}</Text>
          {!!userData?.phone && <Text style={s.profilePhone}>{userData.phone}</Text>}
        </View>
        <View style={[s.roleBadge, { backgroundColor: roleColor.bg }]}>
          <Text style={[s.roleBadgeText, { color: roleColor.text }]}>{ROLE_LABELS[role] ?? role}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
      </TouchableOpacity>

      {renderSectionHeader(tr.settings.account)}
      <View style={s.menuCard}>
        {renderMenuItem('lock', tr.settings.changePassword, () => router.push(`/${routeRole}/change-password` as any))}
      </View>

      {/* BİLDİRİMLER */}
      {renderSectionHeader(tr.settings.notifications)}
      <View style={s.menuCard}>
        <View style={s.menuItem}>
          <View style={s.menuIconBg}>
            <MaterialIcons name="notifications" size={20} color={theme.colors.primary} />
          </View>
          <Text style={s.menuLabel}>Push Bildirimleri</Text>
          <Text style={s.menuValue}>Yakında</Text>
        </View>
        <View style={s.menuDivider} />
        <View style={s.menuItem}>
          <View style={s.menuIconBg}>
            <MaterialIcons name="email" size={20} color={theme.colors.primary} />
          </View>
          <Text style={s.menuLabel}>E-posta Bildirimleri</Text>
          <Text style={s.menuValue}>Yakında</Text>
        </View>
      </View>

      {/* TERCİHLER */}
      {renderSectionHeader('TERCİHLER')}
      <View style={s.menuCard}>
        {/* Para Birimi */}
        <View style={s.menuItem}>
          <View style={s.menuIconBg}>
            <MaterialIcons name="attach-money" size={20} color={theme.colors.primary} />
          </View>
          <Text style={s.menuLabel}>{tr.settings.preferredCurrency}</Text>
        </View>
        <View style={s.prefChipRow}>
          {(['TRY', 'USD', 'EUR'] as Currency[]).map(c => (
            <TouchableOpacity
              key={c}
              style={[s.prefChip, prefs.currency === c && s.prefChipActive]}
              onPress={() => handleCurrencyChange(c)}
              activeOpacity={0.85}
            >
              <Text style={[s.prefChipText, prefs.currency === c && s.prefChipTextActive]}>
                {c === 'TRY' ? '₺ TRY' : c === 'USD' ? '$ USD' : '€ EUR'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.menuDivider} />
        {/* Tema */}
        <View style={s.menuItem}>
          <View style={s.menuIconBg}>
            <MaterialIcons name="brightness-6" size={20} color={theme.colors.primary} />
          </View>
          <Text style={s.menuLabel}>{tr.settings.themeLabel}</Text>
        </View>
        <View style={s.prefChipRow}>
          {([
            ['light', tr.settings.themeLight],
            ['dark', tr.settings.themeDark],
            ['auto', tr.settings.themeAuto],
          ] as [AppTheme, string][]).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={[s.prefChip, preference === val && s.prefChipActive]}
              onPress={() => handleThemeChange(val)}
              activeOpacity={0.85}
            >
              <Text style={[s.prefChipText, preference === val && s.prefChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Animated.View pointerEvents="none" style={[s.preferenceFeedback, feedbackAnimatedStyle]}>
          <MaterialIcons
            name={savingPreference ? 'sync' : 'check-circle'}
            size={16}
            color={savingPreference ? theme.colors.primary : theme.colors.success}
          />
          <Text style={s.preferenceFeedbackText}>
            {savingPreference ? 'Kaydediliyor' : 'Kaydedildi'}
          </Text>
        </Animated.View>
      </View>

      {renderSectionHeader(tr.settings.about)}
      <View style={s.menuCard}>
        {renderMenuItem('description', tr.settings.terms, () => setLegalModal('terms'))}
        <View style={s.menuDivider} />
        {renderMenuItem('privacy-tip', tr.settings.privacy, () => setLegalModal('privacy'))}
        <View style={s.menuDivider} />
        <View style={s.menuItem}>
          <View style={s.menuIconBg}>
            <MaterialIcons name="info" size={20} color={theme.colors.primary} />
          </View>
          <Text style={s.menuLabel}>{tr.settings.version}</Text>
          <Text style={s.menuValue}>1.0.0</Text>
        </View>
      </View>

      {/* ÇIKIŞ */}
      <View style={[s.menuCard, { marginBottom: 40 }]}>
        {renderMenuItem('logout', tr.auth.logout, handleSignOut, undefined, true)}
      </View>

      {/* SETTINGS FOOTER - BRANDING */}
      <View style={s.settingsFooter}>
        <EvimosSVGLogo size={80} variant="icon" isDarkMode={isDarkMode} />
        <Text style={s.footerAppName}>{brand.fullName}</Text>
        <Text style={s.footerSubtitle}>{brand.tagline}</Text>
        <Text style={s.footerVersion}>Sürüm 1.0.0</Text>
        <Text style={s.footerCopyright}>© 2024 EvimOs. Tüm hakları saklıdır.</Text>
      </View>
    </View>
  );

  // ── TAB: Rehber (Agent only) ──────────────────────────────────────
  const renderDirectoryTab = () => {
    return (
      <View style={{ flex: 1 }}>
        <View
          style={[s.scrollContent, { paddingTop: 8 }]}
        >
          {contactsLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : displayContacts.length === 0 ? (
            <View style={s.emptyEmp}>
              <MaterialIcons name="people-outline" size={44} color={theme.colors.textMuted} />
              <Text style={s.emptyEmpText}>
                {contactFilter === 'all'
                  ? 'Henüz kişi yok'
                  : contactFilter === 'technician'
                  ? 'Usta yok'
                  : contactFilter === 'landlord'
                  ? 'Ev sahibi yok'
                  : 'Kiracı yok'}
              </Text>
              <Text style={s.emptyEmpSub}>Sağ üstten yeni kayıt ekleyin</Text>
            </View>
          ) : (
            displayContacts.map(contact => {
              const rc = getRoleColor(theme, contact.role);
              const roleLabel = ROLE_LABELS[contact.role] ?? contact.role;
              const onPress = contact.kind === 'technician'
                ? () => router.push(`/agent/edit-contact?id=${contact.id}` as any)
                : () => router.push(`/agent/contact-detail?id=${contact.id}` as any);
              return (
                <TouchableOpacity
                  key={contact.id}
                  style={s.contactCard}
                  onPress={onPress}
                  activeOpacity={0.85}
                >
                  <View style={[s.contactAvatar, { backgroundColor: rc.bg }]}>
                    <Text style={[s.contactAvatarText, { color: rc.text }]}>
                      {getInitials(contact.full_name ?? '')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.contactNameRow}>
                      <Text style={s.contactName} numberOfLines={1}>{contact.full_name ?? '—'}</Text>
                      <View style={[s.contactRoleBadge, { backgroundColor: rc.bg }]}>
                        <Text style={[s.contactRoleBadgeText, { color: rc.text }]}>{roleLabel}</Text>
                      </View>
                      {!!contact.deleted_at && (
                        <View style={[s.contactRoleBadge, { backgroundColor: theme.colors.surface2 }]}>
                          <Text style={[s.contactRoleBadgeText, { color: theme.colors.textMuted }]}>Arşiv</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.contactEmail} numberOfLines={1}>
                      {contact.kind === 'technician' ? contact.profession ?? 'Usta' : contact.email ?? '—'}
                    </Text>
                    {!!contact.phone && <Text style={s.contactPhone}>{contact.phone}</Text>}
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Sıralama Modal */}
        <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
            <View style={s.sortSheet}>
              <Text style={s.sortSheetTitle}>Sırala</Text>
              {([{ key: 'newest', label: 'Yeni Eklenen' }, { key: 'name', label: 'Alfabetik (A→Z)' }] as const).map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={s.sortSheetOption}
                  onPress={() => { setContactSort(opt.key); setShowSortModal(false); }}
                >
                  <Text style={[s.sortSheetOptionText, contactSort === opt.key && { color: theme.colors.primary, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {contactSort === opt.key && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Tip Seçim Modal */}
        <Modal visible={showAddTypeModal} transparent animationType="slide" onRequestClose={() => setShowAddTypeModal(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAddTypeModal(false)}>
            <View style={s.addTypeSheet}>
              <Text style={s.addTypeTitle}>Kişi Ekle</Text>
              <TouchableOpacity
                style={s.addTypeOption}
                onPress={() => { setShowAddTypeModal(false); router.push('/agent/create-contact' as any); }}
                activeOpacity={0.85}
              >
                <View style={[s.addTypeIconBg, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialIcons name="handyman" size={22} color={theme.colors.primary} />
                </View>
                <Text style={s.addTypeOptionText}>Usta Ekle</Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginLeft: 66 }} />
              <TouchableOpacity
                style={s.addTypeOption}
                onPress={() => { setShowAddTypeModal(false); router.push('/agent/create-user?type=landlord' as any); }}
                activeOpacity={0.85}
              >
                <View style={[s.addTypeIconBg, { backgroundColor: theme.colors.warningLight }]}>
                  <MaterialIcons name="home" size={22} color={theme.colors.warningText} />
                </View>
                <Text style={s.addTypeOptionText}>Ev Sahibi Ekle</Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginLeft: 66 }} />
              <TouchableOpacity
                style={s.addTypeOption}
                onPress={() => { setShowAddTypeModal(false); router.push('/agent/create-user?type=tenant' as any); }}
                activeOpacity={0.85}
              >
                <View style={[s.addTypeIconBg, { backgroundColor: theme.colors.infoLight }]}>
                  <MaterialIcons name="person" size={22} color={theme.colors.infoText} />
                </View>
                <Text style={s.addTypeOptionText}>Kiracı Ekle</Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={s.addTypeCancelBtn} onPress={() => setShowAddTypeModal(false)}>
                <Text style={s.addTypeCancelText}>İptal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  return (
    <AnimatedScreen type="fade">
      <View style={s.container}>
        <AnimatedHeaderScrollView
          headerHeight={isAgent ? 104 : 56}
          stickySubHeader={isAgent && activeTab === 'directory' ? (
            <View style={s.dirFilterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dirFilterScroll}>
                {[
                  { key: 'all' as const, label: 'Tümü' },
                  { key: 'technician' as const, label: 'Ustalar' },
                  { key: 'landlord' as const, label: 'Ev Sahipleri' },
                  { key: 'tenant' as const, label: 'Kiracılar' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.filterChip, contactFilter === opt.key && s.filterChipActive]}
                    onPress={() => setContactFilter(opt.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.filterChipText, contactFilter === opt.key && s.filterChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={s.sortBtn} onPress={() => setShowSortModal(true)} activeOpacity={0.8}>
                <MaterialIcons name="sort" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : undefined}
          headerContent={
            <View style={{ width: '100%' }}>
              {/* Header */}
              <View style={s.header}>
                <Text style={s.headerTitle}>Profil</Text>
                {isAgent && activeTab === 'directory' && (
                  <TouchableOpacity style={s.headerAddBtn} onPress={() => setShowAddTypeModal(true)} activeOpacity={0.85}>
                    <MaterialIcons name="person-add" size={20} color={theme.colors.textInverse} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Tab Bar (sadece agent) */}
              {isAgent && (
                <View style={s.tabBar}>
                  {(['profile', 'directory'] as const).map(tab => (
                    <TouchableOpacity
                      key={tab}
                      style={[s.tab, activeTab === tab && s.tabActive]}
                      onPress={() => setActiveTab(tab)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                        {tab === 'profile' ? 'Profil' : 'Rehber'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          }
          refreshControl={<RefreshControl refreshing={isAgent && activeTab === 'directory' ? contactsLoading : false} onRefresh={() => loadContacts()} tintColor={theme.colors.primary} />}
        >
          {activeTab === 'profile'
            ? renderProfileTab()
            : renderDirectoryTab()
          }
        </AnimatedHeaderScrollView>

        {/* Yasal Modal */}
        <Modal visible={!!legalModal} transparent animationType="slide" onRequestClose={() => setLegalModal(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>
                  {legalModal === 'terms' ? 'Kullanım Şartları' : 'Gizlilik Politikası'}
                </Text>
                <TouchableOpacity onPress={() => setLegalModal(null)} style={s.modalClose}>
                  <MaterialIcons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={s.modalText}>{legalModal === 'terms' ? TERMS_TEXT : PRIVACY_TEXT}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </AnimatedScreen>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: theme.colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle:     { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  tabBar:          { flexDirection: 'row', marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.colors.divider },
  tab:             { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive:       { backgroundColor: theme.colors.primaryLight },
  tabText:         { fontSize: 14, fontWeight: '500', color: theme.colors.textMuted },
  tabTextActive:   { color: theme.colors.textPrimary, fontWeight: '700' },
  scrollContent:   { paddingHorizontal: 20, paddingBottom: 120 },
  profileCard:     { borderRadius: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  avatar:          { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText:      { fontSize: 22, fontWeight: '700', color: theme.colors.primary },
  profileInfo:     { flex: 1 },
  profileName:     { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  profileEmail:    { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  profilePhone:    { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  roleBadge:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  roleBadgeText:   { fontSize: 12, fontWeight: '700' },
  sectionHeaderRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.8 },
  menuCard:        { borderRadius: 16, overflow: 'hidden' },
  menuItem:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  menuIconBg:      { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  menuLabel:       { flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  menuValue:       { fontSize: 14, color: theme.colors.textMuted },
  comingSoonBadge: { fontSize: 11, fontWeight: '700', color: theme.colors.warningText, backgroundColor: theme.colors.warningLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  menuDivider:     { height: 1, backgroundColor: theme.colors.border, marginLeft: 66 },
  expandSection:   { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: theme.colors.surface2 },
  inputLabel:      { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input:           { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 16, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 4 },
  inputRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, marginBottom: 4 },
  inputRowIcon:    { marginRight: 10 },
  inputRowInput:   { flex: 1, paddingVertical: 16, fontSize: 15, color: theme.colors.textPrimary },
  passRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  passToggle:      { padding: 8 },
  saveBtn:         { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  saveBtnText:     { color: theme.colors.textInverse, fontWeight: '700', fontSize: 15 },
  hintText:        { fontSize: 12, color: theme.colors.textMuted, marginTop: 8 },
  addEmployeeBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 8, marginTop: 8 },
  addEmployeeBtnText: { color: theme.colors.textInverse, fontWeight: '700', fontSize: 15 },
  addFormCard:     { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16 },
  empCard:         { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 },
  empHeaderRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empActionPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: theme.colors.primaryLight },
  empActionText:   { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  empName:         { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  empEmail:        { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  empPhone:        { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  empMetaText:     { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  emptyEmp:        { alignItems: 'center', paddingVertical: 40 },
  emptyEmpText:    { fontSize: 16, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 12 },
  emptyEmpSub:     { fontSize: 13, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' },
  // ── Header ekleme butonu ──
  headerAddBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  // ── Rehber: Filtre satırı ──
  dirFilterRow:    { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 12, paddingTop: 12, paddingBottom: 12, gap: 8 },
  dirFilterScroll: { gap: 8, paddingRight: 8 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText:  { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterChipTextActive: { color: theme.colors.textInverse, fontWeight: '700' },
  sortBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surface2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  // ── Kişi Kartı ──
  contactCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 },
  contactAvatar:   { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  contactAvatarText: { fontSize: 18, fontWeight: '700' },
  contactNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  contactName:     { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, flex: 1 },
  contactRoleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  contactRoleBadgeText: { fontSize: 11, fontWeight: '700' },
  contactEmail:    { fontSize: 13, color: theme.colors.textMuted },
  contactPhone:    { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  // ── Sıralama Sheet ──
  sortSheet:       { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  sortSheetTitle:  { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 16 },
  sortSheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sortSheetOptionText: { fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  // ── Tip Seçim Sheet ──
  prefChipRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  prefChip:        { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  prefChipActive:  { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  prefChipText:    { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  prefChipTextActive: { color: theme.colors.primary },
  preferenceFeedback: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginLeft: 16, marginRight: 16, marginBottom: 16, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.surface2 },
  preferenceFeedbackText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  addTypeSheet:    { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  addTypeTitle:    { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 16 },
  addTypeOption:   { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  addTypeIconBg:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addTypeOptionText: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  addTypeCancelBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.colors.surface2, borderRadius: 14 },
  addTypeCancelText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  modalOverlay:    { flex: 1, backgroundColor: theme.colors.modalBackdrop, justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalTitle:      { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  modalClose:      { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface2, justifyContent: 'center', alignItems: 'center' },
  modalBody:       { padding: 20 },
  modalText:       { fontSize: 14, lineHeight: 22, color: theme.colors.textSecondary },
  // ── Settings Footer ──
  settingsFooter:  { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, marginTop: 40, borderTopWidth: 1, borderTopColor: theme.colors.divider },
  footerAppName:   { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 16, textAlign: 'center' },
  footerSubtitle:  { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
  footerVersion:   { fontSize: 12, color: theme.colors.textMuted, marginTop: 12 },
  footerCopyright: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' },
}));
