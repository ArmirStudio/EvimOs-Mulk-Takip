import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { appApi } from '../../services/appApi';
import { OfficeContactsScreen } from '../../components/Shared/OfficeContactsScreen';

interface Contact {
  id: string;
  full_name: string;
  phone: string;
  profession: string;
  created_at: string;
  deleted_at?: string | null;
}

export default function OfficeContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await appApi.listOfficeContacts();
      setContacts(response.contacts || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      Alert.alert('Hata', 'Ustalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    try {
      await appApi.deleteOfficeContact(contact.id);
      setContacts(contacts.map(c =>
        c.id === contact.id ? { ...c, deleted_at: new Date().toISOString() } : c
      ));
      Alert.alert('Başarılı', 'Usta arşivlendi');
    } catch (error) {
      Alert.alert('Hata', 'Usta silinemedi');
    }
  };

  return (
    <OfficeContactsScreen
      contacts={contacts}
      loading={loading}
      onAddPress={() => router.push('/agent/create-contact')}
      onContactPress={contact => router.push(`/agent/edit-contact?id=${contact.id}`)}
      onDeletePress={handleDeleteContact}
      onRefresh={loadContacts}
    />
  );
}
