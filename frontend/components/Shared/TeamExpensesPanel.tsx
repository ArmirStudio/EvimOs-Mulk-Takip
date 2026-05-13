import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { DecimalCurrencyInput } from './DecimalCurrencyInput';
import type { ExpenseCategory, OfficeExpense } from '../../services/teamTypes';
import {
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_CATEGORY_LABELS,
} from '../../services/teamTypes';
import { createExpense, deleteExpense, updateExpense } from '../../services/appApi';
import { uploadFileToSupabaseStorage } from '../../services/supabaseStorage';

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

type Props = {
  expenses: OfficeExpense[];
  loading: boolean;
  error: string | null;
  currentUserId?: string;
  isAgent: boolean;
  onRefresh: () => void;
};

function formatExpenseDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDisplayDate(display: string): string | null {
  const parts = display.split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year || year.length !== 4) return null;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return iso;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

function groupByMonth(expenses: OfficeExpense[]): { label: string; items: OfficeExpense[] }[] {
  const map = new Map<string, OfficeExpense[]>();
  for (const e of expenses) {
    const ym = e.expense_date.slice(0, 7);
    if (!map.has(ym)) map.set(ym, []);
    map.get(ym)!.push(e);
  }
  return Array.from(map.entries()).map(([ym, items]) => {
    const [year, month] = ym.split('-');
    const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    return { label: `${months[parseInt(month) - 1]} ${year}`, items };
  });
}

export default function TeamExpensesPanel({ expenses, loading, error, currentUserId, isAgent, onRefresh }: Props) {
  const theme = useAppTheme();
  const styles = useStyles();

  // Modal / form state — shared between create and edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OfficeExpense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('kira');
  const [dateDisplay, setDateDisplay] = useState(formatExpenseDate(todayISO()));
  const [description, setDescription] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const resetForm = () => {
    setAmount('');
    setCategory('kira');
    setDateDisplay(formatExpenseDate(todayISO()));
    setDescription('');
    setReceiptUri(null);
  };

  const openCreate = () => {
    setEditingExpense(null);
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (expense: OfficeExpense) => {
    setEditingExpense(expense);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setDateDisplay(formatExpenseDate(expense.expense_date));
    setDescription(expense.description || '');
    setReceiptUri(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (submitting || receiptUploading) return;
    setModalVisible(false);
    setEditingExpense(null);
    resetForm();
  };

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const uploadReceiptIfNeeded = async (): Promise<string | null | undefined> => {
    if (!receiptUri) return undefined; // undefined = no change
    setReceiptUploading(true);
    try {
      const upload = await uploadFileToSupabaseStorage({
        bucket: 'receipts',
        path: `expenses/expense_${Date.now()}.jpg`,
        fileUri: receiptUri,
        contentType: 'image/jpeg',
        upsert: true,
      });
      return upload.publicUrl;
    } catch {
      Alert.alert('Uyarı', 'Fotoğraf yüklenemedi, harcama fotoğrafsız kaydedilecek.');
      return null;
    } finally {
      setReceiptUploading(false);
    }
  };

  const handleCreate = async () => {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Geçersiz tutar', 'Lütfen geçerli bir tutar girin.');
      return;
    }
    const isoDate = parseDisplayDate(dateDisplay);
    if (!isoDate) {
      Alert.alert('Geçersiz tarih', 'Tarih GG.AA.YYYY formatında olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      const uploadedUrl = await uploadReceiptIfNeeded();
      await createExpense({
        amount: parsedAmount,
        category,
        description: description.trim() || null,
        expense_date: isoDate,
        receipt_url: uploadedUrl ?? null,
      });
      closeModal();
      onRefresh();
    } catch (e: any) {
      Alert.alert('Kaydedilemedi', e?.detail || e?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingExpense) return;
    const isoDate = parseDisplayDate(dateDisplay);
    if (!isoDate) {
      Alert.alert('Geçersiz tarih', 'Tarih GG.AA.YYYY formatında olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      const uploaded = await uploadReceiptIfNeeded();
      const receiptUrlToSave = uploaded !== undefined ? uploaded : (editingExpense.receipt_url ?? null);
      await updateExpense(editingExpense.id, {
        description: description.trim() || null,
        expense_date: isoDate,
        receipt_url: receiptUrlToSave,
      });
      closeModal();
      onRefresh();
    } catch (e: any) {
      Alert.alert('Kaydedilemedi', e?.detail || e?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (expense: OfficeExpense) => {
    Alert.alert(
      'Harcamayı sil',
      `${formatCurrency(expense.amount)} tutarındaki harcamayı silmek istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              setExpandedId(null);
              onRefresh();
            } catch (e: any) {
              Alert.alert('Hata', e?.detail || e?.message || 'Silinemedi.');
            }
          },
        },
      ]
    );
  };

  const monthTotal = (items: OfficeExpense[]) =>
    items.reduce((sum, e) => sum + e.amount, 0);

  const isEditMode = editingExpense !== null;
  const isBusy = submitting || receiptUploading;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={32} color={theme.colors.textMuted} />
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const grouped = groupByMonth(expenses);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.85}>
        <MaterialIcons name="add" size={18} color={theme.colors.textInverse} />
        <Text style={styles.addBtnText}>Harcama Ekle</Text>
      </TouchableOpacity>

      {expenses.length === 0 && (
        <View style={styles.center}>
          <MaterialIcons name="receipt-long" size={40} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>Henüz harcama yok</Text>
          <Text style={styles.emptyHint}>Ofis giderlerini buradan takip edebilirsiniz.</Text>
        </View>
      )}

      {grouped.map(({ label, items }) => (
        <View key={label} style={styles.section}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthLabel}>{label}</Text>
            <Text style={styles.monthTotal}>{formatCurrency(monthTotal(items))}</Text>
          </View>
          {items.map((expense) => {
            const expanded = expandedId === expense.id;
            const canModify = isAgent || expense.created_by === currentUserId;
            const color = EXPENSE_CATEGORY_COLORS[expense.category as ExpenseCategory] ?? '#95A5A6';
            const icon = EXPENSE_CATEGORY_ICONS[expense.category as ExpenseCategory] ?? 'more-horiz';
            return (
              <React.Fragment key={expense.id}>
                <TouchableOpacity
                  style={styles.expenseCard}
                  onPress={() => {
                    LayoutAnimation.configureNext({
                      duration: 280,
                      create: { type: 'easeInEaseOut', property: 'opacity' },
                      update: { type: 'spring', springDamping: 0.75 },
                      delete: { type: 'easeInEaseOut', property: 'opacity' },
                    });
                    setExpandedId(expanded ? null : expense.id);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.catDot, { backgroundColor: color }]} />
                  <View style={[styles.catIconBox, { backgroundColor: color + '22' }]}>
                    <MaterialIcons name={icon as any} size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catLabel}>
                      {EXPENSE_CATEGORY_LABELS[expense.category as ExpenseCategory] ?? expense.category}
                    </Text>
                    <Text style={styles.expDate}>{formatExpenseDate(expense.expense_date)}</Text>
                  </View>
                  <Text style={styles.expAmount}>{formatCurrency(expense.amount)}</Text>
                  <MaterialIcons
                    name={expanded ? 'expand-less' : 'expand-more'}
                    size={18}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.expenseDetail}>
                    {!!expense.description && (
                      <Text style={styles.detailText}>{expense.description}</Text>
                    )}
                    {!!expense.creator_name && (
                      <Text style={styles.detailMeta}>Ekleyen: {expense.creator_name}</Text>
                    )}
                    {!!expense.receipt_url && (
                      <Text style={[styles.detailMeta, { color: theme.colors.primary }]}>Makbuz mevcut</Text>
                    )}
                    {canModify && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => openEdit(expense)}
                          activeOpacity={0.85}
                        >
                          <MaterialIcons name="edit" size={15} color={theme.colors.primary} />
                          <Text style={styles.editBtnText}>Düzenle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(expense)}
                          activeOpacity={0.85}
                        >
                          <MaterialIcons name="delete-outline" size={15} color={theme.colors.error} />
                          <Text style={styles.deleteBtnText}>Sil</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      ))}

      {/* ── Harcama ekle / düzenle modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.overlay} onPress={closeModal}>
          <Pressable style={styles.sheet}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>
                    {isEditMode ? 'Harcamayı Düzenle' : 'Harcama Ekle'}
                  </Text>
                  <TouchableOpacity onPress={closeModal} disabled={isBusy}>
                    <MaterialIcons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Tutar — create: editable, edit: readonly */}
                <Text style={styles.fieldLabel}>Tutar (₺) *</Text>
                {isEditMode ? (
                  <TextInput
                    style={[styles.amountInput, styles.amountInputDisabled]}
                    value={formatCurrency(Number(amount))}
                    editable={false}
                    placeholder="0,00"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                ) : (
                  <DecimalCurrencyInput
                    inputStyle={styles.amountInput}
                    value={amount}
                    onValueChange={setAmount}
                    placeholder="0,00"
                    placeholderTextColor={theme.colors.textMuted}
                    autoFocus
                  />
                )}
                {isEditMode && (
                  <Text style={styles.lockedHint}>Tutar ve kategori değiştirilemez</Text>
                )}

                {/* Kategori */}
                <Text style={styles.fieldLabel}>Kategori *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  {CATEGORIES.map((cat) => {
                    const active = category === cat;
                    const color = EXPENSE_CATEGORY_COLORS[cat];
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catChip,
                          active && { backgroundColor: color, borderColor: color },
                          isEditMode && { opacity: 0.6 },
                        ]}
                        onPress={isEditMode ? undefined : () => setCategory(cat)}
                        activeOpacity={isEditMode ? 1 : 0.8}
                      >
                        <MaterialIcons
                          name={EXPENSE_CATEGORY_ICONS[cat] as any}
                          size={16}
                          color={active ? '#fff' : color}
                        />
                        <Text style={[styles.catChipText, active && { color: '#fff' }]}>
                          {EXPENSE_CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Tarih */}
                <Text style={styles.fieldLabel}>Tarih * (GG.AA.YYYY)</Text>
                <TextInput
                  style={styles.input}
                  value={dateDisplay}
                  onChangeText={setDateDisplay}
                  placeholder="07.05.2026"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />

                {/* Açıklama */}
                <Text style={styles.fieldLabel}>Açıklama</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="İsteğe bağlı not"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                />

                {/* Makbuz */}
                <TouchableOpacity style={styles.receiptBtn} onPress={pickReceipt} activeOpacity={0.8}>
                  <MaterialIcons
                    name={receiptUri ? 'check-circle' : 'add-a-photo'}
                    size={18}
                    color={receiptUri ? theme.colors.success : theme.colors.primary}
                  />
                  <Text style={[styles.receiptBtnText, receiptUri && { color: theme.colors.success }]}>
                    {receiptUri
                      ? 'Makbuz seçildi'
                      : isEditMode && editingExpense?.receipt_url
                        ? 'Makbuzu değiştir'
                        : 'Makbuz fotoğrafı ekle'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, isBusy && { opacity: 0.6 }]}
                  onPress={isEditMode ? handleUpdate : handleCreate}
                  disabled={isBusy}
                >
                  {isBusy
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.submitBtnText}>{isEditMode ? 'Güncelle' : 'Kaydet'}</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { paddingBottom: 32 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
    emptyText: { fontSize: theme.fontSize.base, color: theme.colors.textMuted, textAlign: 'center' },
    emptyHint: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.primaryLight },
    retryText: { color: theme.colors.primary, fontWeight: theme.fontWeight.bold },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: 12, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingHorizontal: 16, paddingVertical: 10 },
    addBtnText: { color: theme.colors.textInverse, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.sm },
    section: { marginBottom: 16 },
    monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
    monthLabel: { fontSize: theme.fontSize.sm, fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    monthTotal: { fontSize: theme.fontSize.sm, fontWeight: '800', color: theme.colors.textPrimary },
    expenseCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 12, marginBottom: 2, borderWidth: 1, borderColor: theme.colors.border },
    catDot: { width: 4, height: 32, borderRadius: 2 },
    catIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    catLabel: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.textPrimary },
    expDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
    expAmount: { fontSize: theme.fontSize.base, fontWeight: '800', color: theme.colors.textPrimary, marginRight: 4 },
    expenseDetail: { backgroundColor: theme.colors.surface2, borderRadius: theme.borderRadius.lg, padding: 12, marginBottom: 6, marginTop: -2, gap: 8, borderWidth: 1, borderColor: theme.colors.border },
    detailText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 18 },
    detailMeta: { fontSize: 11, color: theme.colors.textMuted },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primaryLight },
    editBtnText: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.primary },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.errorLight },
    deleteBtnText: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.error },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '92%' },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    sheetTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    fieldLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: 6, marginTop: 14 },
    amountInput: { fontSize: 32, fontWeight: '800', color: theme.colors.textPrimary, borderBottomWidth: 2, borderColor: theme.colors.primary, paddingBottom: 8, textAlign: 'center' },
    amountInputDisabled: { color: theme.colors.textSecondary, borderColor: theme.colors.border },
    lockedHint: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 },
    categoryRow: { gap: 8, paddingBottom: 4 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    catChipText: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.textSecondary },
    input: { minHeight: 48, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, paddingHorizontal: 14, fontSize: theme.fontSize.base },
    multiline: { minHeight: 72, paddingTop: 12, textAlignVertical: 'top' },
    receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.primaryLight, marginTop: 14 },
    receiptBtnText: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.primary },
    submitBtn: { marginTop: 20, minHeight: 52, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { color: '#fff', fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.base },
  })
);
