import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../app/theme';

interface Technician {
  id: string;
  full_name: string;
  phone: string;
  profession: string;
  is_deleted?: boolean;
}

interface Props {
  technician: Technician | null;
  onAssign?: () => void;
  canEdit?: boolean;
}

export const AssignedTechnicianCard: React.FC<Props> = ({ technician, onAssign, canEdit }) => {
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Hata', 'Arama yapılamadı')
    );
  };

  if (!technician) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <MaterialIcons name="person-off" size={32} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Usta atanmamış</Text>
          {canEdit && onAssign && (
            <TouchableOpacity style={styles.assignBtn} onPress={onAssign}>
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={styles.assignBtnText}>Usta Seç</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const isDeleted = technician.is_deleted;

  return (
    <View style={styles.container}>
      <View style={[styles.card, isDeleted && styles.cardDeleted]}>
        <View style={[styles.avatar, isDeleted && styles.avatarDeleted]}>
          <MaterialIcons
            name={isDeleted ? 'person-off' : 'person'}
            size={24}
            color="#fff"
          />
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, isDeleted && styles.nameDeleted]}>
              {technician.full_name}
            </Text>
            {isDeleted && <Text style={styles.deletedBadge}>Silindi</Text>}
          </View>

          <Text style={[styles.profession, isDeleted && styles.professionDeleted]}>
            {technician.profession}
          </Text>

          <View style={styles.phoneRow}>
            <MaterialIcons
              name="phone"
              size={14}
              color={isDeleted ? theme.colors.textSecondary : theme.colors.primary}
            />
            <Text style={[styles.phone, isDeleted && styles.phoneDeleted]}>
              {technician.phone}
            </Text>
          </View>
        </View>

        {!isDeleted && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => handleCall(technician.phone)}>
              <MaterialIcons name="call" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {canEdit && onAssign && (
        <TouchableOpacity style={styles.changeBtn} onPress={onAssign}>
          <MaterialIcons name="edit" size={16} color={theme.colors.primary} />
          <Text style={styles.changeBtnText}>Değiştir</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginVertical: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardDeleted: { opacity: 0.6 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarDeleted: { backgroundColor: theme.colors.textSecondary },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  nameDeleted: { color: theme.colors.textSecondary, textDecorationLine: 'line-through' },
  deletedBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: theme.colors.error,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  profession: { fontSize: 12, color: theme.colors.primary, marginBottom: 4 },
  professionDeleted: { color: theme.colors.textSecondary },
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  phone: { fontSize: 12, color: theme.colors.text, marginLeft: 4 },
  phoneDeleted: { color: theme.colors.textSecondary },
  actions: { flexDirection: 'row', marginLeft: 12 },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginVertical: 12 },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    marginTop: 12,
  },
  assignBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 6 },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  changeBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary, marginLeft: 4 },
});
