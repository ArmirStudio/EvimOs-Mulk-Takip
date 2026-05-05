import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../theme';
import { tr } from '../translations';

export default function AdminSettingsScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const handleLogout = async () => {
    Alert.alert(tr.auth.logout, tr.auth.logoutConfirm, [
      { text: tr.auth.cancel, style: 'cancel' },
      { 
        text: tr.auth.logout, 
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('user_data');
          router.replace('/login');
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr.admin.systemSettings}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tr.admin.agentManagement}</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="person-remove-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.settingText, { color: theme.colors.error }]}>{tr.admin.suspendAgentAccount}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.textInverse} />
          <Text style={styles.logoutText}>{tr.auth.logout}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  scroll: { padding: theme.spacing.lg, paddingBottom: 100 },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: '700' },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingText: { marginLeft: theme.spacing.sm, fontWeight: '600', fontSize: theme.fontSize.md },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
  },
  logoutText: { color: theme.colors.textInverse, marginLeft: theme.spacing.xs, fontSize: theme.fontSize.md, fontWeight: 'bold' },
}));
