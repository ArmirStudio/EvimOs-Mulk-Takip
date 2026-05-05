import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { tr } from '../../app/translations';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import { supabase } from '../../services/supabase';
import {
  createSignedStorageUrl,
  uploadFileToSupabaseStorage,
} from '../../services/supabaseStorage';
import {
  canDeletePropertyDocuments,
  canUploadPropertyDocuments,
} from '../../utils/employeeAccess';
import DocumentViewerModal from './DocumentViewerModal';

interface DocumentRecord {
  id: string;
  property_id: string;
  category: string;
  title: string;
  file_url: string;
  storage_path?: string | null;
  uploaded_by: string;
  created_at: string;
}

interface DocumentVaultProps {
  propertyId: string;
}

const CATEGORIES = [
  { id: 'contract', label: tr.documents.contract, icon: 'description' },
  { id: 'insurance', label: tr.documents.insurance, icon: 'verified-user' },
  { id: 'deed', label: tr.documents.deed, icon: 'account-balance' },
  { id: 'bill', label: tr.documents.bill, icon: 'receipt' },
  { id: 'other', label: tr.documents.other, icon: 'folder' },
];

function isPdfDocument(document?: Pick<DocumentRecord, 'title' | 'file_url' | 'storage_path'> | null) {
  const value = `${document?.title || ''} ${document?.storage_path || ''} ${document?.file_url || ''}`.toLowerCase();
  return value.includes('.pdf') || value.includes('application/pdf');
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { marginTop: 20, paddingHorizontal: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    addBtnText: { color: theme.colors.textInverse, fontWeight: '600', fontSize: 12 },
    docCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    docInfo: { flex: 1 },
    docTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
    docMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    actionBtn: { padding: 8 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: theme.colors.textMuted, marginTop: 10, fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: theme.colors.modalBackdrop, justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: theme.colors.textPrimary },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
    categoryItem: {
      width: '30%',
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
      backgroundColor: theme.colors.surface,
    },
    categoryItemSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    categoryLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, textAlign: 'center' },
    uploadBtn: {
      backgroundColor: theme.colors.primary,
      height: 50,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    uploadBtnText: { color: theme.colors.textInverse, fontWeight: '700', fontSize: 16 },
    cancelBtn: { height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelBtnText: { color: theme.colors.textMuted, fontWeight: '600' },
  })
);

export const DocumentVault: React.FC<DocumentVaultProps> = ({ propertyId }) => {
  const theme = useAppTheme();
  const s = useStyles();
  const { userData } = useUserData();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('contract');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | undefined>();
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerPdf, setViewerPdf] = useState(false);

  const canUpload = canUploadPropertyDocuments(userData);
  const canDelete = canDeletePropertyDocuments(userData);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setDocuments((data || []) as DocumentRecord[]);
    } catch (err) {
      console.error('Error fetching docs:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const selectedCategoryMeta = useMemo(
    () => CATEGORIES.find((item) => item.id === selectedCategory) || CATEGORIES[0],
    [selectedCategory]
  );

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setUploading(true);

      const sanitizedName = file.name.replace(/\s+/g, '-');
      const filePath = `${propertyId}/${Date.now()}-${sanitizedName}`;

      const upload = await uploadFileToSupabaseStorage({
        bucket: 'property-documents',
        path: filePath,
        fileUri: file.uri,
        contentType: file.mimeType || 'application/octet-stream',
        client: supabase,
      });

      const { error: dbError } = await supabase.from('property_documents').insert({
        property_id: propertyId,
        category: selectedCategoryMeta.id,
        title: file.name,
        file_url: upload.path,
        storage_path: upload.path,
        uploaded_by: userData?.id,
      });

      if (dbError) {
        throw dbError;
      }

      Alert.alert(tr.common.success, tr.documents.uploadSuccess);
      setShowPicker(false);
      fetchDocuments();
    } catch (err: any) {
      Alert.alert(tr.common.error, err.message || tr.errors.saveFailed);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDocument = async (document: DocumentRecord) => {
    try {
      setViewerLoading(true);
      setViewerTitle(document.title);
      setViewerPdf(isPdfDocument(document));
      const signedUrl = await createSignedStorageUrl(
        'property-documents',
        document.storage_path || document.file_url
      );
      setViewerUrl(signedUrl);
    } catch (err: any) {
      Alert.alert(tr.common.error, err.message || tr.errors.loadFailed);
      setViewerUrl(null);
    } finally {
      setViewerLoading(false);
    }
  };

  const handleDelete = async (document: DocumentRecord) => {
    Alert.alert(tr.common.confirmation, tr.documents.deleteConfirm, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            const storagePath = document.storage_path || document.file_url;
            const { error } = await supabase.from('property_documents').delete().eq('id', document.id);
            if (error) {
              throw error;
            }
            if (storagePath) {
              await supabase.storage.from('property-documents').remove([storagePath]);
            }
            setDocuments((prev) => prev.filter((item) => item.id !== document.id));
          } catch (err: any) {
            Alert.alert(tr.common.error, err.message || tr.errors.saveFailed);
          }
        },
      },
    ]);
  };

  const renderDocument = (document: DocumentRecord) => {
    const category = CATEGORIES.find((item) => item.id === document.category) || CATEGORIES[4];
    return (
      <Animated.View entering={FadeIn} exiting={FadeOut} key={document.id} style={s.docCard}>
        <View style={[s.iconContainer, { backgroundColor: theme.colors.surface2 }]}>
          <MaterialIcons name={category.icon as any} size={24} color={theme.colors.primary} />
        </View>
        <View style={s.docInfo}>
          <Text style={s.docTitle} numberOfLines={1}>
            {document.title}
          </Text>
          <Text style={s.docMeta}>
            {category.label} • {new Date(document.created_at).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleOpenDocument(document)}>
          <MaterialIcons name="visibility" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        {canDelete && (
          <TouchableOpacity onPress={() => handleDelete(document)} style={s.actionBtn}>
            <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return <ActivityIndicator style={{ padding: 20 }} color={theme.colors.primary} />;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{tr.documents.title}</Text>
        {canUpload && (
          <TouchableOpacity onPress={() => setShowPicker(true)} style={s.addBtn}>
            <MaterialIcons name="add" size={20} color={theme.colors.textInverse} />
            <Text style={s.addBtnText}>{tr.documents.addDocument}</Text>
          </TouchableOpacity>
        )}
      </View>

      {documents.length === 0 ? (
        <View style={s.empty}>
          <MaterialIcons name="folder-open" size={40} color={theme.colors.textMuted} />
          <Text style={s.emptyText}>{tr.documents.noDocuments}</Text>
        </View>
      ) : (
        <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
          {documents.map(renderDocument)}
        </ScrollView>
      )}

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{tr.documents.selectCategory}</Text>
            <View style={s.categoryGrid}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={[s.categoryItem, selectedCategory === category.id && s.categoryItemSelected]}
                >
                  <MaterialIcons
                    name={category.icon as any}
                    size={24}
                    color={selectedCategory === category.id ? theme.colors.textInverse : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      s.categoryLabel,
                      selectedCategory === category.id && { color: theme.colors.textInverse },
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handlePickDocument}
              disabled={uploading}
              style={[s.uploadBtn, uploading && { opacity: 0.7 }]}
            >
              {uploading ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={s.uploadBtnText}>{tr.common.submit}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowPicker(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>{tr.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DocumentViewerModal
        visible={!!viewerUrl || viewerLoading}
        onClose={() => {
          setViewerUrl(null);
          setViewerLoading(false);
          setViewerTitle(undefined);
          setViewerPdf(false);
        }}
        title={viewerTitle}
        url={viewerUrl}
        isPdf={viewerPdf}
        loading={viewerLoading}
      />
    </View>
  );
};
