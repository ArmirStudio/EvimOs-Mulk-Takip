import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInRight, FadeInUp } from 'react-native-reanimated';

import { uploadFileToSupabaseStorage } from '../../services/supabaseStorage';
import { createMaintenance, listProperties } from '../../services/appApi';
import { tr } from '../translations';
import { createThemedStyles, useAppTheme } from '../theme';
import { StepIndicator } from '../../components/Shared/StepIndicator';
import KeyboardAwareScrollView, {
  focusAndScrollToInput,
  scrollToInput,
} from '../../components/Shared/KeyboardAwareScrollView';
import { useUserData } from '../../hooks/useUserData';
import { getPropertyImage } from '../../utils/propertyHelpers';
import { getMaintenancePriorityMeta, getMaintenancePriorityTone } from '../../utils/maintenancePresentation';

type PhotoDoc = { uri: string; type: string };
type PriorityOption = 'low' | 'medium' | 'high';
type SubmittedState = {
  requestId: string;
  propertyLabel: string;
  priority: PriorityOption;
  problemLabel: string;
};

const PROBLEM_TYPES = [
  {
    key: 'electrical',
    label: tr.maintenance.wizard.electricalLabel,
    icon: 'flash-outline' as const,
    detail: tr.maintenance.wizard.electricalDetail,
  },
  {
    key: 'plumbing',
    label: tr.maintenance.wizard.plumbingLabel,
    icon: 'water-outline' as const,
    detail: tr.maintenance.wizard.plumbingDetail,
  },
  {
    key: 'structural',
    label: tr.maintenance.wizard.structuralLabel,
    icon: 'home-outline' as const,
    detail: tr.maintenance.wizard.structuralDetail,
  },
  {
    key: 'other',
    label: tr.maintenance.wizard.otherLabel,
    icon: 'construct-outline' as const,
    detail: tr.maintenance.wizard.otherDetail,
  },
];

const PRIORITY_OPTIONS: {
  key: PriorityOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  detail: string;
}[] = [
  {
    key: 'low',
    label: tr.maintenance.wizard.lowLabel,
    icon: 'time-outline',
    detail: tr.maintenance.wizard.lowDetail,
  },
  {
    key: 'medium',
    label: tr.maintenance.wizard.mediumLabel,
    icon: 'alert-circle-outline',
    detail: tr.maintenance.wizard.mediumDetail,
  },
  {
    key: 'high',
    label: tr.maintenance.wizard.highLabel,
    icon: 'warning-outline',
    detail: tr.maintenance.wizard.highDetail,
  },
];

export default function MaintenanceRequestScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { userData } = useUserData();
  const [loading, setLoading] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [submittedState, setSubmittedState] = useState<SubmittedState | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [problemType, setProblemType] = useState<string | null>(null);
  const [priority, setPriority] = useState<PriorityOption | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PhotoDoc[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadProperty();
  }, []);

  const selectedProblem = PROBLEM_TYPES.find((item) => item.key === problemType) || null;
  const selectedPriority = priority || undefined;
  const priorityMeta = selectedPriority ? getMaintenancePriorityMeta(selectedPriority) : null;
  const priorityTone = selectedPriority ? getMaintenancePriorityTone(theme, selectedPriority) : null;
  const propertyLabel = [property?.address, property?.district, property?.city].filter(Boolean).join(', ');
  const propertyImage = getPropertyImage(parseInt(String(property?.id || '0').replace(/\D/g, '').slice(0, 6) || '0', 10));

  const loadProperty = async () => {
    try {
      const data = await listProperties();
      setProperty(data.properties?.[0] || null);
    } catch (e: any) {
      Alert.alert(tr.common.error, e.message || tr.errors.loadFailed);
    } finally {
      setLoadingProperty(false);
    }
  };

  const addPhoto = async (fromCamera: boolean) => {
    if (photos.length >= 5) {
      Alert.alert(tr.errors.limitReached, tr.errors.maxPhotos);
      return;
    }
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(tr.errors.permissionRequired, fromCamera ? tr.errors.cameraPermission : tr.errors.galleryPermission);
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: false });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotos((prev) => [...prev, { uri: asset.uri, type: asset.mimeType || 'image/jpeg' }]);
    }
  };

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  const resetForm = () => {
    setCurrentStep(1);
    setProblemType(null);
    setPriority(null);
    setTitle('');
    setDescription('');
    setPhotos([]);
    setSubmittedState(null);
  };

  const handleSubmit = async () => {
    if (!property) {
      Alert.alert(tr.common.error, tr.errors.noPropertyAssigned);
      return;
    }
    if (!priority) {
      Alert.alert(tr.common.error, tr.maintenance.wizard.priorityRequired);
      return;
    }
    setLoading(true);
    try {
      const actorId = userData?.id || 'maintenance-user';
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i += 1) {
        const p = photos[i];
        const ext = p.type === 'image/png' ? 'png' : 'jpg';
        const objectPath = `${property.id}/${actorId}/${Date.now()}-${i}.${ext}`;
        const upload = await uploadFileToSupabaseStorage({
          bucket: 'maintenance-photos',
          path: objectPath,
          fileUri: p.uri,
          contentType: p.type,
        });
        uploadedUrls.push(upload.path);
      }
      const response = await createMaintenance({
        property_id: property.id,
        title: title.trim(),
        description: description.trim(),
        photo_urls: uploadedUrls,
        priority,
      });
      setSubmittedState({
        requestId: response.request_id,
        propertyLabel,
        priority,
        problemLabel: selectedProblem?.label || tr.tenant.maintenanceAction,
      });
    } catch (e: any) {
      Alert.alert(tr.common.error, e.message || tr.errors.saveFailed);
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = useMemo(() => {
    if (currentStep === 1) return problemType !== null && priority !== null;
    if (currentStep === 2) return title.trim().length > 0 && description.trim().length > 0;
    return true;
  }, [currentStep, description, priority, problemType, title]);

  const goNext = () => {
    if (currentStep === 4) {
      handleSubmit();
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const goBack = () => {
    if (submittedState) {
      setSubmittedState(null);
      return;
    }
    if (currentStep === 1) {
      router.back();
      return;
    }
    setCurrentStep((prev) => prev - 1);
  };

  if (loadingProperty) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel={tr.common.back}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr.maintenance.reportIssue}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="home-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>{tr.errors.noPropertyAssigned}</Text>
          <Text style={styles.emptySubtext}>{tr.tenant.noActiveProperty}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (submittedState) {
    const submittedPriorityMeta = getMaintenancePriorityMeta(submittedState.priority);
    const submittedPriorityTone = getMaintenancePriorityTone(theme, submittedState.priority);
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton} accessibilityLabel={tr.common.back}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr.maintenance.wizard.createdTitle}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.successContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(300)} style={styles.successHero}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={68} color={theme.colors.success} />
            </View>
            <Text style={styles.successTitle}>{tr.maintenance.wizard.createdSuccessTitle}</Text>
            <Text style={styles.successSubtitle}>{tr.maintenance.wizard.createdSuccessSubtitle}</Text>
          </Animated.View>
          <View style={styles.successSummaryCard}>
            <Text style={styles.summaryTitle}>{tr.maintenance.wizard.summaryTitle}</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{tr.maintenance.wizard.requestNumberLabel}</Text><Text style={styles.summaryValue}>#{submittedState.requestId.slice(0, 8)}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{tr.maintenance.wizard.propertyLabel}</Text><Text style={styles.summaryValue}>{submittedState.propertyLabel}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{tr.maintenance.wizard.categoryLabel}</Text><Text style={styles.summaryValue}>{submittedState.problemLabel}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{tr.maintenance.status}</Text><Text style={styles.summaryValue}>{tr.maintenance.wizard.statusWaiting}</Text></View>
            <View style={styles.priorityBadgeRow}>
              <View style={[styles.inlineBadge, { backgroundColor: submittedPriorityTone.backgroundColor, borderColor: submittedPriorityTone.borderColor }]}>
                <Text style={[styles.inlineBadgeText, { color: submittedPriorityTone.textColor }]}>{`${submittedPriorityMeta.label} ${tr.maintenance.wizard.prioritySuffix}`}</Text>
              </View>
              <View style={[styles.inlineBadge, styles.neutralBadge]}>
                <Text style={styles.neutralBadgeText}>{`${photos.length} ${tr.maintenance.wizard.photoCountSuffix}`}</Text>
              </View>
            </View>
          </View>
          <View style={styles.nextStepsCard}>
            <Text style={styles.summaryTitle}>{tr.maintenance.wizard.nextStepsTitle}</Text>
            <View style={styles.nextStepItem}><View style={styles.nextStepDot} /><Text style={styles.nextStepText}>{tr.maintenance.wizard.nextStepTriage}</Text></View>
            <View style={styles.nextStepItem}><View style={styles.nextStepDot} /><Text style={styles.nextStepText}>{tr.maintenance.wizard.nextStepTracking}</Text></View>
            <View style={styles.nextStepItem}><View style={styles.nextStepDot} /><Text style={styles.nextStepText}>{tr.maintenance.wizard.nextStepReview}</Text></View>
          </View>
          <TouchableOpacity style={styles.primaryLargeBtn} onPress={() => router.replace(`/tenant/maintenance?openId=${submittedState.requestId}&openType=maintenance` as any)}>
            <Ionicons name="list-outline" size={18} color={theme.colors.textInverse} />
            <Text style={styles.primaryLargeBtnText}>{tr.maintenance.wizard.viewRequestAction}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryLargeBtn} onPress={resetForm}>
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.secondaryLargeBtnText}>{tr.maintenance.wizard.createNewAction}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} accessibilityLabel={tr.common.back}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr.maintenance.reportIssue}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.heroCard}>
        <Image source={{ uri: property.images?.[0] || propertyImage }} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroEyebrow}>{tr.maintenance.wizard.heroEyebrow}</Text>
          <Text style={styles.heroTitle}>{property.address}</Text>
          <Text style={styles.heroSub}>{property.district}, {property.city}</Text>
        </View>
      </View>
      <StepIndicator currentStep={currentStep} totalSteps={4} labels={[tr.maintenance.wizard.stepCategory, tr.maintenance.wizard.stepDescription, tr.maintenance.wizard.stepPhotos, tr.maintenance.wizard.stepReview]} />
      <KeyboardAwareScrollView scrollRef={scrollRef} contentContainerStyle={styles.stepContent} extraBottomSpace={120}>
        <Animated.View key={`step-${currentStep}`} entering={FadeInRight.duration(220)} style={styles.stepWrap}>
          <View style={styles.summaryStrip}>
            <View style={styles.summaryStripCard}>
              <Text style={styles.summaryStripLabel}>{tr.maintenance.wizard.stepCategory}</Text>
              <Text style={styles.summaryStripValue} numberOfLines={1}>{selectedProblem?.label || tr.maintenance.wizard.notSelected}</Text>
            </View>
            <View style={styles.summaryStripCard}>
              <Text style={styles.summaryStripLabel}>{tr.maintenance.wizard.priorityLabel}</Text>
              {priorityMeta && priorityTone ? (
                <View style={[styles.inlineBadge, { backgroundColor: priorityTone.backgroundColor, borderColor: priorityTone.borderColor }]}>
                  <Text style={[styles.inlineBadgeText, { color: priorityTone.textColor }]}>{priorityMeta.label}</Text>
                </View>
              ) : (
                <Text style={styles.summaryStripHint}>{tr.maintenance.wizard.waitingSelection}</Text>
              )}
            </View>
            <View style={styles.summaryStripCard}>
              <Text style={styles.summaryStripLabel}>{tr.maintenance.photoLabel}</Text>
              <Text style={styles.summaryStripValue}>{photos.length}/5</Text>
            </View>
          </View>
          {currentStep === 1 && (
            <View>
              <Text style={styles.stepTitle}>{tr.maintenance.wizard.issueTypeTitle}</Text>
              <Text style={styles.stepSubtitle}>{tr.maintenance.wizard.issueTypeSubtitle}</Text>
              <View style={styles.problemGrid}>
                {PROBLEM_TYPES.map((pt) => {
                  const isActive = problemType === pt.key;
                  return (
                    <TouchableOpacity
                      key={pt.key}
                      style={[styles.problemCard, isActive && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }]}
                      onPress={() => setProblemType(pt.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                    >
                      <View style={[styles.problemIconWrap, isActive && { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name={pt.icon} size={28} color={isActive ? theme.colors.primary : theme.colors.textSecondary} />
                      </View>
                      <Text style={styles.problemLabel}>{pt.label}</Text>
                      <Text style={styles.problemDetail}>{pt.detail}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.prioritySection}>
                <Text style={styles.sectionEyebrow}>{tr.maintenance.wizard.priorityEyebrow}</Text>
                <Text style={styles.priorityTitle}>{tr.maintenance.wizard.priorityTitle}</Text>
                <Text style={styles.prioritySubtitle}>{tr.maintenance.wizard.prioritySubtitle}</Text>
                <View style={styles.priorityList}>
                  {PRIORITY_OPTIONS.map((item) => {
                    const isSelected = priority === item.key;
                    const tone = getMaintenancePriorityTone(theme, item.key);
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.priorityCard, isSelected && { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}
                        onPress={() => setPriority(item.key)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <View style={[styles.priorityIconWrap, { backgroundColor: isSelected ? theme.colors.surface : theme.colors.surface2 }]}>
                          <Ionicons name={item.icon} size={20} color={isSelected ? tone.accentColor : theme.colors.textSecondary} />
                        </View>
                        <View style={styles.priorityCopy}>
                          <Text style={styles.priorityLabel}>{item.label}</Text>
                          <Text style={styles.priorityDetail}>{item.detail}</Text>
                        </View>
                        {isSelected ? <Ionicons name="checkmark-circle" size={22} color={tone.accentColor} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
          {currentStep === 2 && (
            <View>
              <Text style={styles.stepTitle}>{tr.maintenance.wizard.issueDescriptionTitle}</Text>
              <Text style={styles.stepSubtitle}>{tr.maintenance.wizard.issueDescriptionSubtitle}</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => focusAndScrollToInput(scrollRef, titleInputRef, 96)}>
                <Text style={styles.inputLabel}>{tr.maintenance.wizard.titleLabel}</Text>
              </TouchableOpacity>
              <TextInput
                ref={titleInputRef}
                style={styles.input}
                placeholder={tr.maintenance.wizard.titlePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
                onFocus={() => scrollToInput(scrollRef, titleInputRef, 96)}
                onSubmitEditing={() => focusAndScrollToInput(scrollRef, descriptionInputRef, 140)}
              />
              <TouchableOpacity activeOpacity={0.85} onPress={() => focusAndScrollToInput(scrollRef, descriptionInputRef, 140)}>
                <Text style={styles.inputLabel}>{tr.maintenance.wizard.descriptionLabel}</Text>
              </TouchableOpacity>
              <TextInput
                ref={descriptionInputRef}
                style={[styles.input, styles.textArea]}
                placeholder={tr.maintenance.wizard.descriptionPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                onFocus={() => scrollToInput(scrollRef, descriptionInputRef, 140)}
              />
              <View style={styles.liveSummaryCard}>
                <Text style={styles.summaryTitle}>{tr.maintenance.wizard.liveSummaryTitle}</Text>
                <Text style={styles.liveSummaryTitle}>{title.trim() || tr.maintenance.wizard.liveSummaryEmptyTitle}</Text>
                <Text style={styles.liveSummaryBody}>{description.trim() || tr.maintenance.wizard.liveSummaryEmptyDescription}</Text>
              </View>
            </View>
          )}
          {currentStep === 3 && (
            <View>
              <Text style={styles.stepTitle}>{tr.maintenance.wizard.photosTitle}</Text>
              <Text style={styles.stepSubtitle}>{tr.maintenance.wizard.photosSubtitle}</Text>
              <View style={styles.photosGrid}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoWrapper}>
                    <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(index)}>
                      <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 5 && (
                  <>
                    <TouchableOpacity style={styles.addPhotoBtn} onPress={() => addPhoto(true)}>
                      <Ionicons name="camera-outline" size={28} color={theme.colors.primary} />
                      <Text style={styles.addPhotoTitle}>{tr.maintenance.wizard.cameraTitle}</Text>
                      <Text style={styles.addPhotoDetail}>{tr.maintenance.wizard.cameraDetail}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addPhotoBtn} onPress={() => addPhoto(false)}>
                      <Ionicons name="images-outline" size={28} color={theme.colors.primary} />
                      <Text style={styles.addPhotoTitle}>{tr.maintenance.wizard.galleryTitle}</Text>
                      <Text style={styles.addPhotoDetail}>{tr.maintenance.wizard.galleryDetail}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
          {currentStep === 4 && (
            <View>
              <Text style={styles.stepTitle}>{tr.maintenance.wizard.reviewTitle}</Text>
              <Text style={styles.stepSubtitle}>{tr.maintenance.wizard.reviewSubtitle}</Text>
              <View style={styles.reviewCard}>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{tr.maintenance.wizard.propertyLabel}</Text><Text style={styles.reviewValue}>{propertyLabel}</Text></View>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{tr.maintenance.wizard.categoryLabel}</Text><Text style={styles.reviewValue}>{selectedProblem?.label || '-'}</Text></View>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{tr.maintenance.wizard.titleLabel}</Text><Text style={styles.reviewValue}>{title || '-'}</Text></View>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{tr.maintenance.photoLabel}</Text><Text style={styles.reviewValue}>{photos.length > 0 ? `${photos.length} ${tr.maintenance.wizard.photoCountSuffix}` : tr.maintenance.wizard.notAdded}</Text></View>
                <View style={styles.reviewPriorityRow}>
                  <Text style={styles.reviewLabel}>{tr.maintenance.wizard.priorityLabel}</Text>
                  {priorityMeta && priorityTone ? (
                    <View style={[styles.inlineBadge, { backgroundColor: priorityTone.backgroundColor, borderColor: priorityTone.borderColor }]}>
                      <Text style={[styles.inlineBadgeText, { color: priorityTone.textColor }]}>{priorityMeta.label}</Text>
                    </View>
                  ) : (
                    <Text style={styles.reviewValue}>-</Text>
                  )}
                </View>
                <Text style={styles.reviewDescription}>{description || '-'}</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </KeyboardAwareScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerRow}>
          {currentStep > 1 ? (
            <TouchableOpacity style={styles.backCta} onPress={goBack}>
              <Ionicons name="arrow-back" size={18} color={theme.colors.primary} />
              <Text style={styles.backCtaText}>{tr.common.back}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.footerSpacer} />
          )}
          <TouchableOpacity style={[styles.nextButton, !canGoNext && currentStep !== 3 ? styles.nextButtonDisabled : null]} onPress={goNext} disabled={!canGoNext && currentStep !== 3}>
            {loading ? <ActivityIndicator color={theme.colors.textInverse} /> : <><Text style={styles.nextButtonText}>{currentStep === 4 ? tr.common.submit : tr.common.next}</Text><Ionicons name="arrow-forward" size={18} color={theme.colors.textInverse} /></>}
          </TouchableOpacity>
        </View>
        {currentStep === 3 && <TouchableOpacity style={styles.skipBtn} onPress={goNext}><Text style={styles.skipBtnText}>{tr.maintenance.wizard.continueWithoutPhotos}</Text></TouchableOpacity>}
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  headerSpacer: { width: 44, height: 44 },
  heroCard: { marginHorizontal: 16, marginBottom: 14, height: 156, borderRadius: 24, overflow: 'hidden', backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlayStrong },
  heroTextWrap: { flex: 1, justifyContent: 'flex-end', padding: 18 },
  heroEyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: theme.colors.textInverse, opacity: 0.8, marginBottom: 6 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textInverse },
  heroSub: { fontSize: 13, color: theme.colors.textInverse, opacity: 0.88, marginTop: 4 },
  stepContent: { paddingHorizontal: 16 },
  stepWrap: { flex: 1 },
  summaryStrip: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryStripCard: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
  summaryStripLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: theme.colors.textMuted, marginBottom: 8 },
  summaryStripValue: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  summaryStripHint: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  inlineBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  inlineBadgeText: { fontSize: 12, fontWeight: '700' },
  neutralBadge: { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
  neutralBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  stepTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  stepSubtitle: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 18 },
  problemGrid: { gap: 12 },
  problemCard: { padding: 16, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
  problemIconWrap: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.colors.surface2, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  problemLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  problemDetail: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 18 },
  prioritySection: { marginTop: 20, backgroundColor: theme.colors.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
  sectionEyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: theme.colors.textMuted, marginBottom: 6 },
  priorityTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  prioritySubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  priorityList: { gap: 10 },
  priorityCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 },
  priorityIconWrap: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  priorityCopy: { flex: 1 },
  priorityLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  priorityDetail: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 14, ...theme.shadows.sm },
  textArea: { minHeight: 156 },
  liveSummaryCard: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginTop: 4, ...theme.shadows.sm },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  liveSummaryTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  liveSummaryBody: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginTop: 8 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoWrapper: { width: '47%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden', position: 'relative', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: theme.colors.surface, borderRadius: 12 },
  addPhotoBtn: { width: '47%', aspectRatio: 1, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 14 },
  addPhotoTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  addPhotoDetail: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },
  reviewCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  reviewPriorityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 10 },
  reviewLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase' },
  reviewValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  reviewDescription: { marginTop: 8, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 21 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 10 },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerSpacer: { width: 90 },
  backCta: { minWidth: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  backCtaText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  nextButton: { flex: 1, backgroundColor: theme.colors.primary, borderRadius: 16, paddingVertical: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 52 },
  nextButtonDisabled: { opacity: 0.45 },
  nextButtonText: { fontSize: 15, fontWeight: '700', color: theme.colors.textInverse },
  skipBtn: { paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  skipBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8 },
  successContent: { padding: 16 },
  successHero: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', marginBottom: 16, ...theme.shadows.sm },
  successIconWrap: { width: 92, height: 92, borderRadius: 46, backgroundColor: theme.colors.successLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: 8 },
  successSummaryCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16, ...theme.shadows.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  summaryLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: theme.colors.textMuted },
  summaryValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  priorityBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  nextStepsCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 18, ...theme.shadows.sm },
  nextStepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  nextStepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginTop: 6 },
  nextStepText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  primaryLargeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: theme.colors.primary, marginBottom: 10 },
  primaryLargeBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.textInverse },
  secondaryLargeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  secondaryLargeBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
}));
