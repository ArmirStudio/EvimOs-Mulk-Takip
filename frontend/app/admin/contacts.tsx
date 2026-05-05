import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createThemedStyles, useAppTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { tr } from '../translations';
import { listAdminContacts } from '../../services/appApi';

interface Contact {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  agency_id: string | null;
  agencies: {
    name: string;
    location: string;
    logo_url: string | null;
    brand_color_primary: string;
  } | null;
}

export default function ContactsScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await listAdminContacts();
      const typedData = ((response.contacts as any[]) || []).map((item: any) => ({
        ...item,
        agencies: Array.isArray(item.agencies) ? item.agencies[0] : item.agencies,
      })) as Contact[];
      setContacts(typedData);
      setFilteredContacts(typedData);
    } catch (error) {
      console.error('Fetch contacts error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(
      c =>
        c.full_name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
    );
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  const handleCall = async (phone: string | null) => {
    if (!phone) return;
    try {
      const url = `tel:${phone}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        alert('Bu cihazda telefon araması desteklenmiyor.');
      }
    } catch (error) {
      console.error('Error opening tel:', error);
    }
  };

  const handleEmail = async (email: string) => {
    try {
      const url = `mailto:${email}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        alert('Bu cihazda e-posta gönderimi desteklenmiyor.');
      }
    } catch (error) {
      console.error('Error opening mailto:', error);
    }
  };

  const ContactCard = ({ contact }: { contact: Contact }) => (
    <View style={styles.card}>
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: contact.agencies?.brand_color_primary || theme.colors.primary,
          },
        ]}
      >
        <Text style={styles.avatarText}>
          {contact.full_name
            .split(' ')
            .map(n => n.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2)}
        </Text>
      </View>

      {/* Contact Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{contact.full_name}</Text>
        <Text style={styles.email}>{contact.email}</Text>
        {contact.phone && <Text style={styles.phone}>{contact.phone}</Text>}

        {/* Agency Badge */}
        {contact.agencies ? (
          <View
            style={[
              styles.agencyBadge,
              {
                backgroundColor: `${contact.agencies.brand_color_primary}20`,
                borderColor: contact.agencies.brand_color_primary,
              },
            ]}
          >
            <Text
              style={[
                styles.agencyBadgeText,
                { color: contact.agencies.brand_color_primary },
              ]}
            >
              {contact.agencies.name}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.agencyBadge,
              { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.agencyBadgeText, { color: theme.colors.textMuted }]}>
              Bağımsız
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {contact.phone && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCall(contact.phone)}
          >
            <Ionicons name="call" size={18} color={theme.colors.success} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEmail(contact.email)}
        >
          <Ionicons name="mail" size={18} color={theme.colors.info} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{tr.admin.contactsAndDirectory}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={`${tr.common.search}...`}
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Contacts List */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchContacts} />}
      >
        {filteredContacts.length > 0 ? (
          <>
            <Text style={styles.resultCount}>
              {filteredContacts.length} {filteredContacts.length === 1 ? 'kişi' : 'kişi'}
            </Text>
            {filteredContacts.map(contact => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={64} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Sonuç bulunamadı'
                : tr.admin.noContacts}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
  },
  resultCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    marginLeft: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textInverse,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  email: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  phone: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  agencyBadge: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  agencyBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginLeft: theme.spacing.md,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
}));
