import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../app/theme';

interface Contact {
  id: string;
  full_name: string;
  phone: string;
  profession: string;
}

interface Props {
  visible: boolean;
  contacts: Contact[];
  loading?: boolean;
  onSelect: (contact: Contact) => void;
  onClose: () => void;
  professionFilter?: string;
}

export const TechnicianSelectModal: React.FC<Props> = ({
  visible,
  contacts,
  loading,
  onSelect,
  onClose,
  professionFilter,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return (contacts || []).filter(c => {
      const matchesSearch = !search ||
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      const matchesProfession = !professionFilter || c.profession === professionFilter;
      return matchesSearch && matchesProfession;
    });
  }, [contacts, search, professionFilter]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Usta Seç</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ad veya telefon ara..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {/* Loading */}
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={styles.list}>
              {filtered.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialIcons name="person-off" size={40} color={theme.colors.textMuted} />
                  <Text style={styles.emptyText}>Usta bulunamadı</Text>
                </View>
              ) : (
                filtered.map(contact => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.item}
                    onPress={() => {
                      onSelect(contact);
                      onClose();
                    }}
                  >
                    <View style={styles.itemAvatar}>
                      <Text style={styles.itemAvatarText}>
                        {contact.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{contact.full_name}</Text>
                      <Text style={styles.itemProfession}>{contact.profession}</Text>
                      <Text style={styles.itemPhone}>{contact.phone}</Text>
                    </View>

                    <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
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
  list: { flex: 1, paddingHorizontal: 16 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemAvatarText: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  itemProfession: { fontSize: 12, color: theme.colors.primary, marginTop: 2 },
  itemPhone: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
});
