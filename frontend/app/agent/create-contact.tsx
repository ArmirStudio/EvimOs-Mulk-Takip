import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../app/theme';
import { appApi } from '../../services/appApi';
import { normalizeTurkishPhone } from '../../utils/phone';

interface Profession {
  id: number;
  name: string;
}

export default function CreateContactPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [showProfessionMenu, setShowProfessionMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfessions();
  }, []);

  const loadProfessions = async () => {
    try {
      const response = await appApi.listProfessions();
      setProfessions(response.professions || []);
    } catch (error) {
      console.error('Failed to load professions:', error);
    }
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !phone.trim() || !profession.trim()) {
      Alert.alert('Hata', 'Ad, telefon ve meslek zorunludur');
      return;
    }

    const normalizedPhone = normalizeTurkishPhone(phone);
    if (!normalizedPhone) {
      Alert.alert('Hata', 'Geçersiz telefon numarası');
      return;
    }

    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Hata', 'Geçersiz email adresi');
      return;
    }

    try {
      setLoading(true);
      await appApi.createOfficeContact({
        full_name: fullName.trim(),
        phone: normalizedPhone,
        email: email.trim() || undefined,
        profession: profession.trim(),
      });

      Alert.alert('Başarılı', 'Usta eklendi', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const message = error?.message || 'Usta eklenirken hata oluştu';
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Usta Ekle</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Ad Soyad *</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Ahmet Usta"
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Telefon *</Text>
          <TextInput
            style={styles.input}
            placeholder="0534 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Profession */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Meslek *</Text>
          <TouchableOpacity
            style={[styles.input, styles.pickerInput]}
            onPress={() => setShowProfessionMenu(!showProfessionMenu)}
            disabled={loading}
          >
            <Text style={profession ? styles.inputText : styles.placeholderText}>
              {profession || 'Meslek seç'}
            </Text>
            <MaterialIcons
              name={showProfessionMenu ? 'expand-less' : 'expand-more'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {showProfessionMenu && (
            <View style={styles.pickerOptions}>
              {professions.map(prof => (
                <TouchableOpacity
                  key={prof.id}
                  style={styles.option}
                  onPress={() => {
                    setProfession(prof.name);
                    setShowProfessionMenu(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      profession === prof.name && styles.optionTextSelected,
                    ]}
                  >
                    {prof.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.option}
                onPress={() => setShowProfessionMenu(false)}
              >
                <Text style={styles.optionTextCancel}>Kapat</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email (Opsiyonel)</Text>
          <TextInput
            style={styles.input}
            placeholder="usta@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={!loading}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Usta Ekle</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  form: { paddingHorizontal: 16, paddingVertical: 16 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 14,
    color: theme.colors.text,
  },
  pickerInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputText: { fontSize: 14, color: theme.colors.text },
  placeholderText: { fontSize: 14, color: theme.colors.textSecondary },
  pickerOptions: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  option: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optionText: { fontSize: 14, color: theme.colors.text },
  optionTextSelected: { fontWeight: '600', color: theme.colors.primary },
  optionTextCancel: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  submitBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
