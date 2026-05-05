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
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { tr } from '../../app/translations';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import {
  addLandlordMaintenanceNote,
  addMaintenanceLog,
  getMaintenance,
  reviewMaintenanceAsTenant,
  transitionMaintenance,
} from '../../services/appApi';
import { appApi } from '../../services/appApi';
import { supabase } from '../../services/supabase';
import {
  createSignedStorageUrl,
  resolveSupabaseStorageUrl,
  uploadFileToSupabaseStorage,
} from '../../services/supabaseStorage';
import {
  formatMaintenanceDate,
  getMaintenanceNextAction,
  getMaintenancePriorityMeta,
  getMaintenancePriorityTone,
  getMaintenancePropertyLabel,
  getMaintenanceRoleLabel,
  getMaintenanceStatusMeta,
  getMaintenanceStatusTone,
} from '../../utils/maintenancePresentation';
import { ActionSlider } from './ActionSlider';
import DetailSheetScaffold from './DetailSheetScaffold';
import DocumentViewerModal from './DocumentViewerModal';
import { MaintenanceFlow } from './MaintenanceFlow';
import { AssignedTechnicianCard } from './AssignedTechnicianCard';
import { TechnicianSelectModal } from './TechnicianSelectModal';

interface MaintenanceDetailViewProps {
  requestId: string;
  onClose: () => void;
}

function canManageMaintenance(userData: any, request: any) {
  if (!userData || !request?.property) {
    return false;
  }
  if (userData.role === 'admin') {
    return true;
  }
  if (request.property.employee_id) {
    return userData.role === 'employee' && userData.id === request.property.employee_id;
  }
  return userData.role === 'agent' && userData.id === request.property.agent_id;
}

function canTenantReview(userData: any, request: any) {
  return (
    userData?.role === 'tenant' &&
    request?.property?.tenant_id === userData.id &&
    request?.status === 'completed' &&
    !request?.tenant_approved_at
  );
}

export const MaintenanceDetailView: React.FC<MaintenanceDetailViewProps> = ({
  requestId,
  onClose,
}) => {
  const theme = useAppTheme();
  const styles = useStyles();
  const { userData } = useUserData();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const [note, setNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [viewerUrls, setViewerUrls] = useState<string[]>([]);
  const [viewerTitle, setViewerTitle] = useState<string | undefined>();
  const [viewerLoading, setViewerLoading] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [technicianContacts, setTechnicianContacts] = useState<any[]>([]);
  const [technicianContactsLoading, setTechnicianContactsLoading] = useState(false);

  const loadRequest = useCallback(async () => {
    try {
      const response = await getMaintenance(requestId);
      setRequest(response);
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.maintenance.detailLoadError);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const manager = useMemo(() => canManageMaintenance(userData, request), [request, userData]);
  const tenantReviewer = useMemo(() => canTenantReview(userData, request), [request, userData]);
  const requestLogs = Array.isArray(request?.logs) ? request.logs : [];
  const requestPhotos = Array.isArray(request?.photo_urls) ? request.photo_urls : [];
  const awaitingTenantApproval =
    request?.status === 'completed' && !!request?.property?.tenant_id && !request?.tenant_approved_at;
  const statusMeta = getMaintenanceStatusMeta(request?.status, { awaitingTenantApproval });
  const statusTone = getMaintenanceStatusTone(theme, request?.status, { awaitingTenantApproval });
  const priorityMeta = getMaintenancePriorityMeta(request?.priority);
  const priorityTone = getMaintenancePriorityTone(theme, request?.priority);
  const userRole = userData?.role || 'tenant';
  const landlordViewer = userRole === 'landlord';

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.75,
      selectionLimit: Math.max(1, 6 - selectedPhotos.length),
    });

    if (!result.canceled) {
      setSelectedPhotos((prev) => [...prev, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const uploadSelectedPhotos = async () => {
    if (selectedPhotos.length === 0) {
      return [];
    }

    const uploads = [];
    for (let index = 0; index < selectedPhotos.length; index += 1) {
      const uri = selectedPhotos[index];
      const path = `${requestId}/${Date.now()}-${index}.jpg`;
      const upload = await uploadFileToSupabaseStorage({
        bucket: 'maintenance-photos',
        path,
        fileUri: uri,
        contentType: 'image/jpeg',
        client: supabase,
      });
      uploads.push(upload.path);
    }

    return uploads;
  };

  const loadTechnicians = useCallback(async () => {
    try {
      setTechnicianContactsLoading(true);
      const response = await appApi.listOfficeContacts();
      setTechnicianContacts(response.contacts?.filter((c: any) => !c.deleted_at) || []);
    } catch (error: any) {
      Alert.alert('Hata', 'Ustalar yüklenemedi');
    } finally {
      setTechnicianContactsLoading(false);
    }
  }, []);

  const handleAssignTechnician = useCallback(
    async (technician: any) => {
      try {
        setSubmitting(true);
        await appApi.post(`/maintenance/${requestId}/assign-technician`, {
          technician_id: technician.id,
        });
        setShowTechnicianModal(false);
        await loadRequest();
        Alert.alert('Başarılı', 'Usta atandı');
      } catch (error: any) {
        Alert.alert('Hata', error.message || 'Usta ataması başarısız');
      } finally {
        setSubmitting(false);
      }
    },
    [requestId, loadRequest]
  );

  const resetComposer = () => {
    setNote('');
    setSelectedPhotos([]);
  };

  const openPhotoViewer = useCallback(
    async (paths: string[], title: string) => {
      const normalizedPaths = paths.filter(Boolean);
      if (normalizedPaths.length === 0) {
        return;
      }

      try {
        setViewerTitle(title);
        setViewerLoading(true);

        const signedUrls = await Promise.all(
          normalizedPaths.map(async (item) => {
            // Her zaman signed URL üret — private bucket'larda public URL çalışmaz
            // ve tarayıcıya yönlendirme yapar. createSignedStorageUrl hem path
            // hem tam URL formatını destekler.
            try {
              return await createSignedStorageUrl('maintenance-photos', item);
            } catch {
              // Signed URL üretilemezse public URL'ye fallback yap
              return resolveSupabaseStorageUrl('maintenance-photos', item) || item;
            }
          })
        );

        const finalUrls = signedUrls.filter((item): item is string => !!item);
        if (finalUrls.length === 0) {
          throw new Error(tr.maintenance.photoLinkError);
        }

        setViewerUrls(finalUrls);
      } catch (error: any) {
        Alert.alert(tr.common.error, error.message || tr.maintenance.photoOpenError);
      } finally {
        setViewerLoading(false);
      }
    },
    []
  );

  const handleTransition = async (action: 'start' | 'reject' | 'complete' | 'reopen') => {
    try {
      setSubmitting(true);
      const photoUrls = await uploadSelectedPhotos();
      await transitionMaintenance(requestId, {
        action,
        note: note.trim() || undefined,
        photo_urls: photoUrls,
      });
      resetComposer();
      await loadRequest();
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.maintenance.transitionError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLog = async () => {
    if (!note.trim() && selectedPhotos.length === 0) {
      Alert.alert(tr.common.warning, tr.maintenance.updateNoteRequired);
      return;
    }

    try {
      setSubmitting(true);
      const photoUrls = await uploadSelectedPhotos();
      await addMaintenanceLog(requestId, {
        note: note.trim() || undefined,
        photo_urls: photoUrls,
      });
      resetComposer();
      await loadRequest();
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.maintenance.updateSaveError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLandlordNote = async () => {
    if (!note.trim()) {
      Alert.alert(tr.common.warning, tr.maintenance.landlordNoteRequired);
      return;
    }

    try {
      setSubmitting(true);
      await addLandlordMaintenanceNote(requestId, {
        note: note.trim(),
      });
      resetComposer();
      await loadRequest();
      Alert.alert(tr.common.success, tr.maintenance.landlordNoteSuccess);
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.maintenance.landlordNoteError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTenantReview = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      Alert.alert(tr.common.warning, tr.maintenance.tenantReviewError);
      return;
    }

    try {
      setSubmitting(true);
      await reviewMaintenanceAsTenant(requestId, {
        action,
        reason: action === 'reject' ? rejectionReason.trim() : undefined,
      });
      setRejectionReason('');
      await loadRequest();
    } catch (error: any) {
      Alert.alert(tr.common.error, error.message || tr.maintenance.tenantReviewErrorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{tr.maintenance.detailNotFound}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>{tr.common.close}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const propertyLabel = getMaintenancePropertyLabel(request);
  const nextAction = getMaintenanceNextAction(request, userRole);
  const impactLabel =
    userRole === 'landlord'
      ? tr.maintenance.impactLabelLandlord
      : userRole === 'tenant'
      ? tr.maintenance.impactLabelTenant
      : tr.maintenance.impactLabelManager;

  return (
    <View style={styles.container}>
      <DetailSheetScaffold
        title={tr.maintenance.detailTitle}
        onClose={onClose}
        footer={
          tenantReviewer ? (
            <ActionSlider
              onApprove={() => handleTenantReview('approve')}
              onReject={() => handleTenantReview('reject')}
              approveText={tr.common.confirm}
              rejectText={tr.common.reject}
              disabled={submitting}
            />
          ) : undefined
        }
      >
        <Animated.View entering={FadeInUp.delay(40)} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <MaterialIcons name={statusMeta.icon as any} size={24} color={statusTone.accentColor} />
            </View>
            <View style={styles.heroTopText}>
              <Text style={styles.heroEyebrow}>{tr.maintenance.flowTitle}</Text>
              <Text style={styles.heroTitle}>{request.title || tr.maintenance.detailFallbackTitle}</Text>
            </View>
          </View>

          <Text style={styles.heroSubtitle}>{propertyLabel}</Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: statusTone.backgroundColor,
                  borderColor: statusTone.borderColor,
                },
              ]}
            >
              <Text style={[styles.heroBadgeText, { color: statusTone.textColor }]}>{statusMeta.label}</Text>
            </View>
            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: priorityTone.backgroundColor,
                  borderColor: priorityTone.borderColor,
                },
              ]}
            >
              <Text style={[styles.heroBadgeText, { color: priorityTone.textColor }]}>
                {`${priorityMeta.label} ${tr.maintenance.wizard.prioritySuffix}`}
              </Text>
            </View>
          </View>

          {!!request.description && <Text style={styles.description}>{request.description}</Text>}

          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{tr.maintenance.creatorLabel}</Text>
              <Text style={styles.metricValue}>{request.creator_name || tr.common.system}</Text>
              <Text style={styles.metricHint}>{getMaintenanceRoleLabel(request.creator_role)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{impactLabel}</Text>
              <Text style={styles.metricValue}>{nextAction}</Text>
              <Text style={styles.metricHint}>{statusMeta.description}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <MaterialIcons name="schedule" size={14} color={theme.colors.primary} />
              <Text style={styles.metaPillText}>{formatMaintenanceDate(request.created_at, 'datetime')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.metaPill, requestPhotos.length === 0 && styles.metaPillDisabled]}
              activeOpacity={requestPhotos.length > 0 ? 0.85 : 1}
              disabled={requestPhotos.length === 0}
              onPress={() => openPhotoViewer(requestPhotos, tr.maintenance.requestPhotosTitle)}
            >
              <MaterialIcons name="photo-library" size={14} color={theme.colors.primary} />
              <Text style={styles.metaPillText}>
                {`${requestPhotos.length} ${tr.maintenance.wizard.photoCountSuffix}`}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(90)}>
          <MaintenanceFlow request={request} />
        </Animated.View>

        {request.tenant_rejection_reason && (
          <Animated.View entering={FadeInUp.delay(120)} style={styles.warningCard}>
            <MaterialIcons name="info" size={18} color={theme.colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>{tr.maintenance.tenantFeedbackTitle}</Text>
              <Text style={styles.warningText}>{request.tenant_rejection_reason}</Text>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(160)} style={styles.insightCard}>
          <Text style={styles.sectionTitle}>{tr.maintenance.statusOverview}</Text>
          <View style={styles.insightRow}>
            <View style={styles.insightMetric}>
              <Text style={styles.insightLabel}>{tr.maintenance.prioritySummaryLabel}</Text>
              <Text style={styles.insightValue}>{priorityMeta.summary}</Text>
            </View>
            <View style={styles.insightMetric}>
              <Text style={styles.insightLabel}>{tr.maintenance.lastMoveLabel}</Text>
              <Text style={styles.insightValue}>{formatMaintenanceDate(request.updated_at, 'relative')}</Text>
            </View>
          </View>
        </Animated.View>

        {manager && (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.technicianSection}>
            <View style={styles.technicianHeader}>
              <Text style={styles.sectionTitle}>Görevli Usta</Text>
              <TouchableOpacity
                onPress={() => {
                  loadTechnicians();
                  setShowTechnicianModal(true);
                }}
                disabled={submitting}
                style={styles.assignBtn}
              >
                <MaterialIcons name="edit" size={16} color={theme.colors.textInverse} />
                <Text style={styles.assignBtnText}>Usta Seç</Text>
              </TouchableOpacity>
            </View>
            {request?.assigned_technician_snapshot ? (
              <AssignedTechnicianCard
                technician={request.assigned_technician_snapshot}
                onAssign={() => {
                  loadTechnicians();
                  setShowTechnicianModal(true);
                }}
                canEdit={manager}
              />
            ) : (
              <Text style={styles.noTechnicianText}>Henüz usta atanmadı</Text>
            )}
          </Animated.View>
        )}

        {requestLogs.length > 0 && (
          <Animated.View entering={FadeInUp.delay(220)} style={styles.logsCard}>
            <Text style={styles.sectionTitle}>{tr.maintenance.logsTitle}</Text>
            {requestLogs.map((log: any, index: number) => {
              const photoCount = Array.isArray(log.photo_urls) ? log.photo_urls.length : 0;
              const isLast = index === requestLogs.length - 1;

              return (
                <View key={log.id || `${log.created_at}-${index}`} style={[styles.logRow, isLast && styles.logRowLast]}>
                  <View style={styles.logRail}>
                    <View style={styles.logDot} />
                    {!isLast && <View style={styles.logLine} />}
                  </View>
                  <View style={styles.logBody}>
                    <View style={styles.logHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.logName}>{log.user_name || tr.common.user}</Text>
                        <Text style={styles.logRole}>{getMaintenanceRoleLabel(log.user_role)}</Text>
                      </View>
                      <Text style={styles.logDate}>{formatMaintenanceDate(log.created_at, 'datetime')}</Text>
                    </View>
                    {!!log.note && <Text style={styles.logNote}>{log.note}</Text>}
                    {photoCount > 0 && (
                      <TouchableOpacity
                        style={styles.logPhotoBadge}
                        activeOpacity={0.85}
                        onPress={() =>
                          openPhotoViewer(
                            log.photo_urls,
                            `${getMaintenanceRoleLabel(log.user_role)} ${tr.maintenance.rolePhotosSuffix}`
                          )
                        }
                      >
                        <MaterialIcons name="photo-library" size={14} color={theme.colors.primary} />
                        <Text style={styles.logPhotoText}>
                          {`${photoCount} ${tr.maintenance.wizard.photoCountSuffix}`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {manager && (
          <Animated.View entering={FadeInUp.delay(260)} style={styles.managerCard}>
            <Text style={styles.sectionTitle}>{tr.maintenance.actionPanel}</Text>
            <Text style={styles.helperText}>{tr.maintenance.actionPanelHelper}</Text>
            <TextInput
              style={styles.input}
              placeholder={tr.maintenance.notePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.photoComposerRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhotos} disabled={submitting}>
                <MaterialIcons name="add-photo-alternate" size={18} color={theme.colors.primary} />
                <Text style={styles.photoBtnText}>{tr.maintenance.addPhotoAction}</Text>
              </TouchableOpacity>
              {selectedPhotos.length > 0 && (
                <Text style={styles.photoCounter}>{`${selectedPhotos.length} ${tr.maintenance.selectedFiles}`}</Text>
              )}
            </View>

            {selectedPhotos.length > 0 && (
              <View style={styles.selectedPhotoList}>
                {selectedPhotos.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.selectedPhotoItem}>
                    <MaterialIcons name="image" size={16} color={theme.colors.primary} />
                    <Text style={styles.selectedPhotoLabel}>{`${tr.maintenance.photoLabel} ${index + 1}`}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedPhotos((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <MaterialIcons name="close" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {request.status === 'pending' && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.secondaryAction, submitting && styles.disabledAction]}
                  onPress={() => handleTransition('reject')}
                  disabled={submitting}
                >
                  <MaterialIcons name="close" size={16} color={theme.colors.error} />
                  <Text style={[styles.secondaryActionText, { color: theme.colors.error }]}>{tr.maintenance.markRejected}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryAction, submitting && styles.disabledAction]}
                  onPress={() => handleTransition('start')}
                  disabled={submitting}
                >
                  <MaterialIcons name="play-arrow" size={16} color={theme.colors.textInverse} />
                  <Text style={styles.primaryActionText}>{tr.maintenance.takeOwnership}</Text>
                </TouchableOpacity>
              </View>
            )}

            {request.status === 'in_progress' && (
              <>
                <TouchableOpacity
                  style={[styles.logAction, submitting && styles.disabledAction]}
                  onPress={handleAddLog}
                  disabled={submitting}
                >
                  <MaterialIcons name="notes" size={16} color={theme.colors.primary} />
                  <Text style={styles.logActionText}>{tr.maintenance.addUpdate}</Text>
                </TouchableOpacity>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.secondaryAction, submitting && styles.disabledAction]}
                    onPress={() => handleTransition('reopen')}
                    disabled={submitting}
                  >
                    <MaterialIcons name="undo" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.secondaryActionText}>{tr.maintenance.moveToWaiting}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.successAction, submitting && styles.disabledAction]}
                    onPress={() => handleTransition('complete')}
                    disabled={submitting}
                  >
                    <MaterialIcons name="check-circle" size={16} color={theme.colors.textInverse} />
                    <Text style={styles.primaryActionText}>{tr.maintenance.markDone}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        )}

        {!manager && landlordViewer && (
          <Animated.View entering={FadeInUp.delay(260)} style={styles.landlordCard}>
            <Text style={styles.sectionTitle}>{tr.maintenance.landlordNoteTitle}</Text>
            <Text style={styles.helperText}>{tr.maintenance.landlordNoteHelper}</Text>
            <View style={styles.landlordMiniGrid}>
              <View style={styles.landlordMiniCard}>
                <Text style={styles.metricLabel}>{tr.maintenance.statusLabel}</Text>
                <Text style={styles.metricValue}>{statusMeta.label}</Text>
              </View>
              <View style={styles.landlordMiniCard}>
                <Text style={styles.metricLabel}>{tr.maintenance.expectedStep}</Text>
                <Text style={styles.metricValue}>{nextAction}</Text>
              </View>
            </View>
            <TextInput
              style={[styles.input, { marginTop: 16 }]}
              placeholder={tr.maintenance.landlordNotePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.landlordNoteAction, submitting && styles.disabledAction]}
              onPress={handleLandlordNote}
              disabled={submitting}
            >
              <MaterialIcons name="campaign" size={16} color={theme.colors.textInverse} />
              <Text style={styles.primaryActionText}>{tr.maintenance.landlordNoteSubmit}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {tenantReviewer && (
          <Animated.View entering={FadeInUp.delay(300)} style={styles.tenantCard}>
            <Text style={styles.sectionTitle}>{tr.maintenance.tenantReviewTitle}</Text>
            <Text style={styles.helperText}>{tr.maintenance.tenantReviewHelper}</Text>
            <TextInput
              style={styles.input}
              placeholder={tr.maintenance.tenantReviewPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Animated.View>
        )}

      </DetailSheetScaffold>

      <DocumentViewerModal
        visible={viewerLoading || viewerUrls.length > 0}
        onClose={() => {
          setViewerUrls([]);
          setViewerTitle(undefined);
          setViewerLoading(false);
        }}
        title={viewerTitle}
        urls={viewerUrls}
        loading={viewerLoading}
      />

      {submitting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={theme.colors.textInverse} />
        </View>
      )}

      <TechnicianSelectModal
        visible={showTechnicianModal}
        contacts={technicianContacts}
        loading={technicianContactsLoading}
        onSelect={handleAssignTechnician}
        onClose={() => setShowTechnicianModal(false)}
      />
    </View>
  );
};

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: { fontSize: 16, color: theme.colors.textPrimary, fontWeight: '600' },
    closeBtn: {
      marginTop: 16,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
    },
    closeBtnText: { color: theme.colors.textInverse, fontWeight: '700' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
    scrollContent: { padding: 16 },
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
      ...theme.shadows.md,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    heroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroTopText: { flex: 1 },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    heroTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
    heroSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
    },
    heroBadge: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },
    heroBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    description: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      marginTop: 14,
    },
    metricGrid: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    metricCard: {
      flex: 1,
      backgroundColor: theme.colors.surface2,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
      marginBottom: 6,
    },
    metricValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    metricHint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.primaryLight,
    },
    metaPillDisabled: {
      opacity: 0.55,
    },
    metaPillText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: theme.colors.warningLight,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.warning,
    },
    warningTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.warning, marginBottom: 4 },
    warningText: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
    insightCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
      ...theme.shadows.sm,
    },
    insightRow: { flexDirection: 'row', gap: 12 },
    insightMetric: {
      flex: 1,
      backgroundColor: theme.colors.surface2,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    insightLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
      marginBottom: 6,
    },
    insightValue: {
      fontSize: 13,
      color: theme.colors.textPrimary,
      lineHeight: 18,
      fontWeight: '600',
    },
    logsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
      ...theme.shadows.sm,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
    logRow: {
      flexDirection: 'row',
      gap: 12,
      paddingBottom: 14,
    },
    logRowLast: { paddingBottom: 0 },
    logRail: { width: 18, alignItems: 'center' },
    logDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
      marginTop: 6,
    },
    logLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 999,
    },
    logBody: {
      flex: 1,
      backgroundColor: theme.colors.surface2,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    logName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
    logRole: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
    logDate: { fontSize: 11, color: theme.colors.textMuted, maxWidth: 120, textAlign: 'right' },
    logNote: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19, marginTop: 8 },
    logPhotoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.primaryLight,
    },
    logPhotoText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
    managerCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
      ...theme.shadows.sm,
    },
    landlordCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
      ...theme.shadows.sm,
    },
    landlordMiniGrid: { flexDirection: 'row', gap: 10 },
    landlordMiniCard: {
      flex: 1,
      backgroundColor: theme.colors.surface2,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tenantCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
      ...theme.shadows.sm,
    },
    helperText: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 12, lineHeight: 18 },
    input: {
      backgroundColor: theme.colors.surface2,
      borderRadius: 14,
      padding: 12,
      fontSize: 14,
      color: theme.colors.textPrimary,
      minHeight: 96,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    photoComposerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
    },
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    photoBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
    photoCounter: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
    selectedPhotoList: { gap: 8, marginBottom: 12 },
    selectedPhotoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedPhotoLabel: { flex: 1, fontSize: 13, color: theme.colors.textSecondary },
    actionRow: { flexDirection: 'row', gap: 10 },
    secondaryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryActionText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
    primaryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
    },
    successAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.success,
    },
    primaryActionText: { fontSize: 14, fontWeight: '700', color: theme.colors.textInverse },
    logAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      marginBottom: 10,
    },
    logActionText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    landlordNoteAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
    },
    disabledAction: { opacity: 0.55 },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlayStrong,
      justifyContent: 'center',
      alignItems: 'center',
    },
    technicianSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    technicianHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    assignBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
    },
    assignBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textInverse,
    },
    noTechnicianText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
  })
);
