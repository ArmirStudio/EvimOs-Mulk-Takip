import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../app/theme';

interface Contact {
  id: string;
  full_name: string;
  phone: string;
  profession: string;
  created_at: string;
  deleted_at?: string | null;
}

interface Props {
  contacts: Contact[];
  loading?: boolean;
  onAddPress: () => void;
  onContactPress: (contact: Contact) => void;
  onDeletePress: (contact: Contact) => void;
  onRefresh: () => void;
}

export const OfficeContactsScreen: React.FC<Props> = ({
  contacts = [],
  loading,
  onAddPress,
  onContactPress,
  onDeletePress,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [professionFilter, setProfessionFilter] = useState<string | null>(null);

  const professions = useMemo(() => {
    return [...new Set((contacts || []).map(c => c.profession))];
  }, [contacts]);

  const filtered = useMemo(() => {
    let list = (contacts || []).filter(c => {
      const isActive = !c.deleted_at;
      const matchesTab = activeTab === 'active' ? isActive : !isActive;
      const matchesSearch = !searchQuery ||
        c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery);
      const matchesProfession = !professionFilter || c.profession === professionFilter;
      return matchesTab && matchesSearch && matchesProfession;
    });

    return list.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [contacts, searchQuery, activeTab, professionFilter]);

  const renderContactItem = ({ item: contact }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => onContactPress(contact)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
        <Text style={styles.avatarText}>{contact.full_name.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{contact.full_name}</Text>
          {contact.deleted_at && <Text style={styles.deletedBadge}>Silindi</Text>}
        </View>
        <Text style={styles.profession}>{contact.profession}</Text>
        <Text style={styles.phone}>{contact.phone}</Text>
      </View>

      {!contact.deleted_at && (
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => {
            Alert.alert('İşlem', 'Ne yapmak istiyorsunuz?', [
              { text: 'Düzenle', onPress: () => onContactPress(contact) },
              {
                text: 'Sil',
                onPress: () => {
                  Alert.alert('Usta Sil', 'Bu usta arşivlenecek. Emin misiniz?', [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Sil',
                      style: 'destructive',
                      onPress: () => onDeletePress(contact),
                    },
                  ]);
                },
                style: 'destructive',
              },
              { text: 'İptal', style: 'cancel' },
            ]);
          }}
        >
          <MaterialIcons name="more-vert" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rehber</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAddPress}>
          <MaterialIcons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['active', 'archived'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'active' ? `Aktif (${contacts.filter(c => !c.deleted_at).length})` : `Arşiv (${contacts.filter(c => c.deleted_at).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ad veya telefon ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      {/* Profession Filter */}
      {professions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !professionFilter && styles.filterChipActive]}
            onPress={() => setProfessionFilter(null)}
          >
            <Text
              style={[styles.filterChipText, !professionFilter && styles.filterChipTextActive]}
            >
              Tümü
            </Text>
          </TouchableOpacity>
          {professions.map(prof => (
            <TouchableOpacity
              key={prof}
              style={[styles.filterChip, professionFilter === prof && styles.filterChipActive]}
              onPress={() => setProfessionFilter(prof)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  professionFilter === prof && styles.filterChipTextActive,
                ]}
              >
                {prof}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="person-off" size={40} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Usta bulunamadı' : 'Henüz usta yok'}
          </Text>
          {!searchQuery && activeTab === 'active' && (
            <TouchableOpacity style={styles.emptyBtn} onPress={onAddPress}>
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Usta Ekle</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderContactItem}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingVertical: 12 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  contactInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  deletedBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: theme.colors.error,
    borderRadius: 3,
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  profession: { fontSize: 12, color: theme.colors.primary, marginBottom: 2 },
  phone: { fontSize: 12, color: theme.colors.textSecondary },
  moreBtn: { padding: 8 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 12 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 6 },
});
