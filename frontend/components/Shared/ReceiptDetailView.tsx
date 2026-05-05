import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { tr } from '../../app/translations';
import { createThemedStyles, getBadgeStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import {
  getReceipt,
  reviewReceipt,
  revokeReceiptReview,
  withdrawReceipt,
} from '../../services/appApi';
import { createSignedStorageUrl } from '../../services/supabaseStorage';
import { formatCurrency } from '../../utils/propertyHelpers';
import {
  canReviewReceipt,
  canRevokeReceiptReview,
  canWithdrawReceipt,
} from '../../utils/employeeAccess';
import { ActionSlider } from './ActionSlider';
import DetailSheetScaffold from './DetailSheetScaffold';
import DocumentViewerModal from './DocumentViewerModal';

interface ReceiptDetailViewProps {
  receiptId: string;
  onClose: () => void;
}

const RECEIPT_TYPE_LABELS: Record<string, string> = {
  rent: tr.receipts.rent,
  dues: tr.receipts.dues,
  other: tr.receipts.other,
};

const RECEIPT_STATUS_LABELS: Record<string, string> = {
  pending: tr.receipts.pending,
  approved: tr.receipts.approved,
  rejected: tr.receipts.rejected,
  withdrawn: tr.receipts.withdrawn,
};

function isPdfDocument(receipt: any) {
  const haystack = `${receipt?.storage_path || ''} ${receipt?.document_url || ''} ${receipt?.file_url || ''}`.toLowerCase();
  return haystack.includes('.pdf') || haystack.includes('application/pdf');
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ReceiptDetailView: React.FC<ReceiptDetailViewProps> = ({ receiptId, onClose }) => {
  const theme = useAppTheme();
  const styles = useStyles();
  const badgeStyles = getBadgeStyles(theme);
  const { userData } = useUserData();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | undefined>();
  const [viewerPdf, setViewerPdf] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);

  const loadReceipt = useCallback(async () => {
    try {
      const response = await getReceipt(receiptId);
      setReceipt(response);
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.receipts.loadError);
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    loadReceipt();
  }, [loadReceipt]);

  const reviewAuthority = useMemo(
    () => canReviewReceipt(userData) && receipt?.status === 'pending',
    [receipt?.status, userData]
  );
  const withdrawAuthority = useMemo(
    () =>
      canWithdrawReceipt(userData, receipt?.uploaded_by) &&
      ['pending', 'rejected'].includes(receipt?.status),
    [receipt?.status, receipt?.uploaded_by, userData]
  );
  const revokeAuthority = useMemo(
    () =>
      canRevokeReceiptReview(userData) && ['approved', 'rejected'].includes(receipt?.status),
    [receipt?.status, userData]
  );

  const handleReview = async (action: 'approve' | 'reject') => {
    try {
      setSubmitting(true);
      await reviewReceipt(receiptId, { action });
      await loadReceipt();
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.receipts.reviewError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setSubmitting(true);
      await withdrawReceipt(receiptId, {
        reason: withdrawReason.trim() || undefined,
      });
      setWithdrawReason('');
      await loadReceipt();
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.receipts.withdrawError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      Alert.alert(tr.common.warning, tr.receipts.decisionReasonRequired);
      return;
    }

    try {
      setSubmitting(true);
      await revokeReceiptReview(receiptId, {
        reason: revokeReason.trim(),
      });
      setRevokeReason('');
      await loadReceipt();
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.receipts.revokeError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDocument = async () => {
    try {
      setViewerLoading(true);
      setViewerTitle(RECEIPT_TYPE_LABELS[receipt?.receipt_type] || tr.receipts.receipt);
      setViewerPdf(isPdfDocument(receipt));
      const signedUrl = await createSignedStorageUrl(
        'receipts',
        receipt?.storage_path || receipt?.document_url || receipt?.file_url
      );
      if (!signedUrl) {
        throw new Error(tr.common.documentUnavailable);
      }
      setViewerUrl(signedUrl);
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.receipts.documentOpenError);
      setViewerUrl(null);
    } finally {
      setViewerLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>{tr.receipts.emptyTitle}</Text>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{tr.common.close}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = (badgeStyles as any)[receipt.status] || badgeStyles.pending;
  const events = Array.isArray(receipt.events) ? receipt.events : [];

  return (
    <View style={styles.container}>
      <DetailSheetScaffold
        title={tr.receipts.detailTitle}
        onClose={onClose}
        footer={
          reviewAuthority ? (
            <ActionSlider
              onApprove={() => handleReview('approve')}
              onReject={() => handleReview('reject')}
              approveText={tr.common.confirm}
              rejectText={tr.common.reject}
              disabled={submitting}
            />
          ) : undefined
        }
      >
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>{tr.receipts.amountLabel}</Text>
          <Text style={styles.amountValue}>{formatCurrency(Number(receipt.amount || 0))}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: badge.background,
                borderColor: badge.border,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: badge.text }]}>
              {RECEIPT_STATUS_LABELS[receipt.status] || receipt.status}
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{tr.receipts.paymentType}</Text>
              <Text style={styles.infoValue}>
                {RECEIPT_TYPE_LABELS[receipt.receipt_type] || tr.receipts.receipt}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{tr.receipts.monthLabel}</Text>
              <Text style={styles.infoValue}>{receipt.month || '-'}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { marginTop: 15 }]}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{tr.receipts.propertyLabel}</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {[receipt.property?.address, receipt.property?.city, receipt.property?.district]
                  .filter(Boolean)
                  .join(', ') || '-'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{tr.receipts.uploaderLabel}</Text>
              <Text style={styles.infoValue}>
                {receipt.uploader?.full_name || receipt.uploader_name || receipt.uploader?.email || '-'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{tr.receipts.createdAtLabel}</Text>
              <Text style={styles.infoValue}>{formatDate(receipt.created_at)}</Text>
            </View>
          </View>
        </View>

        {receipt.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr.receipts.notesTitle}</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{receipt.notes}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tr.receipts.documentTitle}</Text>
          <TouchableOpacity style={styles.viewerButton} onPress={handleOpenDocument} activeOpacity={0.85}>
            <MaterialIcons
              name={isPdfDocument(receipt) ? 'picture-as-pdf' : 'visibility'}
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.viewerButtonText}>
              {isPdfDocument(receipt) ? tr.receipts.openPdf : tr.receipts.openReceipt}
            </Text>
          </TouchableOpacity>
        </View>

        {withdrawAuthority && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr.receipts.withdrawTitle}</Text>
            <TextInput
              style={styles.textArea}
              placeholder={tr.receipts.withdrawPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={withdrawReason}
              onChangeText={setWithdrawReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.withdrawButton, submitting && styles.disabledButton]}
              onPress={handleWithdraw}
              disabled={submitting}
            >
              <MaterialIcons name="undo" size={16} color={theme.colors.error} />
              <Text style={styles.withdrawButtonText}>{tr.receipts.withdrawAction}</Text>
            </TouchableOpacity>
          </View>
        )}

        {userData?.role === 'tenant' &&
          receipt?.uploaded_by === userData.id &&
          ['rejected', 'withdrawn'].includes(receipt.status) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{tr.receipts.reuploadTitle}</Text>
              <TouchableOpacity
                style={styles.reuploadButton}
                onPress={() =>
                  router.push(`/tenant/upload-receipt?replaceReceiptId=${receiptId}` as any)
                }
                activeOpacity={0.85}
              >
                <MaterialIcons name="upload-file" size={16} color={theme.colors.textInverse} />
                <Text style={styles.reuploadButtonText}>{tr.receipts.reuploadAction}</Text>
              </TouchableOpacity>
            </View>
          )}

        {revokeAuthority && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr.receipts.revokeTitle}</Text>
            <TextInput
              style={styles.textArea}
              placeholder={tr.receipts.revokePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={revokeReason}
              onChangeText={setRevokeReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.revokeButton, submitting && styles.disabledButton]}
              onPress={handleRevoke}
              disabled={submitting}
            >
              <MaterialIcons name="history" size={16} color={theme.colors.primary} />
              <Text style={styles.revokeButtonText}>{tr.receipts.revokeAction}</Text>
            </TouchableOpacity>
          </View>
        )}

        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr.receipts.historyTitle}</Text>
            <View style={styles.timelineCard}>
              {events.map((event: any, index: number) => (
                <View
                  key={event.id || `${event.event_type}-${index}`}
                  style={[styles.timelineItem, index === events.length - 1 && styles.timelineItemLast]}
                >
                  <View style={styles.timelineBullet} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{event.event_type}</Text>
                    <Text style={styles.timelineMeta}>
                      {event.actor?.full_name || event.actor?.email || tr.common.system} - {formatDate(event.created_at)}
                    </Text>
                    {event.detail ? <Text style={styles.timelineDetail}>{event.detail}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </DetailSheetScaffold>

      <DocumentViewerModal
        visible={!!viewerUrl || viewerLoading}
        onClose={() => {
          setViewerUrl(null);
          setViewerTitle(undefined);
          setViewerPdf(false);
          setViewerLoading(false);
        }}
        title={viewerTitle}
        url={viewerUrl}
        isPdf={viewerPdf}
        loading={viewerLoading}
      />
    </View>
  );
};

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorTitle: { fontSize: 18, color: theme.colors.textPrimary, fontWeight: '700' },
    backBtn: { marginTop: 20, padding: 12 },
    backBtnText: { color: theme.colors.primary, fontWeight: '600' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
    iconBtn: { padding: 8 },
    scroll: { flex: 1 },
    amountCard: {
      backgroundColor: theme.colors.surface,
      margin: 20,
      borderRadius: 24,
      padding: 25,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    amountLabel: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600', marginBottom: 5 },
    amountValue: { fontSize: 36, fontWeight: '800', color: theme.colors.primary, marginBottom: 15 },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
    },
    statusText: { fontSize: 12, fontWeight: '700' },
    infoSection: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 20,
      padding: 20,
      borderRadius: 20,
      ...theme.shadows.sm,
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
    infoItem: { flex: 1 },
    infoLabel: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    infoValue: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: '600' },
    divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 15 },
    section: { marginTop: 25, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
    notesBox: { backgroundColor: theme.colors.surface2, padding: 15, borderRadius: 12 },
    notesText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
    viewerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
    },
    viewerButtonText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    textArea: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      minHeight: 90,
      padding: 12,
      fontSize: 14,
      color: theme.colors.textPrimary,
      marginBottom: 12,
    },
    withdrawButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorLight,
    },
    withdrawButtonText: { fontSize: 14, fontWeight: '700', color: theme.colors.error },
    revokeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    revokeButtonText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    reuploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
    },
    reuploadButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textInverse,
    },
    disabledButton: { opacity: 0.6 },
    timelineCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    timelineItem: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    timelineItemLast: { borderBottomWidth: 0 },
    timelineBullet: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 6,
      backgroundColor: theme.colors.primary,
    },
    timelineContent: { flex: 1 },
    timelineTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textTransform: 'capitalize',
    },
    timelineMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 3 },
    timelineDetail: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 18 },
    footer: { position: 'absolute', bottom: 30, left: 0, right: 0 },
  })
);
