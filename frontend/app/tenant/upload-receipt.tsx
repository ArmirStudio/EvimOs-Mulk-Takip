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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { uploadFileToSupabaseStorage } from '../../services/supabaseStorage';
import { listProperties, listReceipts, uploadReceipt } from '../../services/appApi';
import { tr } from '../translations';
import { createThemedStyles, useAppTheme } from '../theme';
import { StepIndicator } from '../../components/Shared/StepIndicator';
import { CompactDatePicker } from '../../components/Shared/CompactDatePicker';
import { CurrencyInput } from '../../components/Shared/CurrencyInput';
import KeyboardAwareScrollView, {
  focusAndScrollToInput,
  scrollToInput,
} from '../../components/Shared/KeyboardAwareScrollView';
import { useUserData } from '../../hooks/useUserData';
import { getPropertyImage } from '../../utils/propertyHelpers';

type UploadedDoc = {
  uri: string;
  type: string;
  name: string;
  size?: number;
};

type ReceiptType = 'rent' | 'dues' | 'other';
type SubmittedState = {
  receiptId: string;
  propertyLabel: string;
  receiptType: ReceiptType;
  amount: string;
  month: string;
  documentName: string;
  notes: string;
};

const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_RECEIPT_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const RECEIPT_TYPES: { key: ReceiptType; labelKey: string; icon: string }[] = [
  { key: 'rent',  labelKey: 'rent',  icon: 'receipt-long' },
  { key: 'dues',  labelKey: 'dues',  icon: 'apartment'    },
  { key: 'other', labelKey: 'other', icon: 'attach-money' },
];

function getFileExt(contentType: string, fallbackName: string) {
  if (fallbackName.includes('.')) return fallbackName.split('.').pop() || 'bin';
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'application/pdf') return 'pdf';
  return 'bin';
}

function formatMonthDisplay(value: string): string {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length < 2) return value;
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${months[mIdx]} ${parts[0]}`;
}

function validateReceiptDocument(document: UploadedDoc): string | null {
  const contentType = (document.type || '').toLowerCase();
  if (!ALLOWED_RECEIPT_CONTENT_TYPES.has(contentType)) {
    return 'Sadece JPG, PNG, WEBP veya PDF dosyasi yukleyebilirsiniz.';
  }
  if (document.size && document.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
    return 'Dosya boyutu 10 MB sinirini asamaz.';
  }
  return null;
}

export default function UploadReceiptScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { userData } = useUserData();
  const { replaceReceiptId } = useLocalSearchParams<{ replaceReceiptId?: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [submittedState, setSubmittedState] = useState<SubmittedState | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [receiptType, setReceiptType] = useState<ReceiptType | null>(null);
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('');
  const [notes, setNotes] = useState('');
  const [document, setDocument] = useState<UploadedDoc | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const amountInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setMonth(getCurrentMonth());
    loadProperty();
  }, []);

  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${currentMonth}`;
  };

  const propertyLabel = [property?.address, property?.district, property?.city].filter(Boolean).join(', ');
  const propertyImage = getPropertyImage(
    parseInt(String(property?.id || '0').replace(/\D/g, '').slice(0, 6) || '0', 10)
  );
  const typeCardTitle = receiptType
    ? (tr.receipts[receiptType as keyof typeof tr.receipts] as string)
    : tr.receipts.wizard.selectedNone;
  const notesPreview = notes.trim() || tr.receipts.wizard.notesEmpty;

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(tr.errors.permissionRequired, tr.errors.galleryPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const nextDocument = {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `receipt-${Date.now()}.jpg`,
        size: asset.fileSize,
      };
      const validationError = validateReceiptDocument(nextDocument);
      if (validationError) {
        Alert.alert(tr.common.error, validationError);
        return;
      }
      setDocument(nextDocument);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(tr.errors.permissionRequired, tr.errors.cameraPermission);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const nextDocument = {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `receipt-${Date.now()}.jpg`,
        size: asset.fileSize,
      };
      const validationError = validateReceiptDocument(nextDocument);
      if (validationError) {
        Alert.alert(tr.common.error, validationError);
        return;
      }
      setDocument(nextDocument);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const nextDocument = {
          uri: asset.uri,
          type: asset.mimeType || 'application/pdf',
          name: asset.name || `receipt-${Date.now()}.pdf`,
          size: asset.size,
        };
        const validationError = validateReceiptDocument(nextDocument);
        if (validationError) {
          Alert.alert(tr.common.error, validationError);
          return;
        }
        setDocument(nextDocument);
      }
    } catch {
      Alert.alert(tr.common.error, tr.errors.loadFailed);
    }
  };

  const handleUpload = async () => {
    if (!property) {
      Alert.alert(tr.common.error, tr.errors.noPropertyAssigned);
      return;
    }
    if (!amount.trim() || !document || !receiptType) {
      Alert.alert(tr.common.error, tr.errors.fillRequired);
      return;
    }
    const documentValidationError = validateReceiptDocument(document);
    if (documentValidationError) {
      Alert.alert(tr.common.error, documentValidationError);
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert(tr.common.error, tr.errors.invalidAmount);
      return;
    }

    setLoading(true);
    try {
      const actorId = userData?.id || 'receipt-user';

      // Erken ödeme kontrolü — kira tipinde ve kira günü tanımlıysa
      if (receiptType === 'rent' && property?.rent_day) {
        const today = new Date();
        const dayOfMonth = today.getDate();
        const daysUntilPayment = property.rent_day - dayOfMonth;

        if (daysUntilPayment >= 0 && daysUntilPayment <= 3) {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

          const receiptsResponse = await listReceipts({ propertyId: property.id, status: 'approved' });
          const hasApprovedLastMonthRent = (receiptsResponse.receipts || []).some(
            (item: any) => item.receipt_type === 'rent' && item.month === lastMonthStr
          );

          if (!hasApprovedLastMonthRent) {
            const confirmed = await new Promise<boolean>(resolve => {
              Alert.alert(
                tr.receipts.earlyPaymentTitle,
                tr.receipts.earlyPaymentMessage,
                [
                  { text: tr.common.cancel, onPress: () => resolve(false), style: 'cancel' },
                  { text: tr.receipts.continuePayment, onPress: () => resolve(true) },
                ]
              );
            });

            if (!confirmed) {
              setLoading(false);
              return;
            }
          }
        }
      }

      const ext = getFileExt(document.type, document.name);
      const objectPath = `${property.id}/${actorId}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;

      const upload = await uploadFileToSupabaseStorage({
        bucket: 'receipts',
        path: objectPath,
        fileUri: document.uri,
        contentType: document.type,
      });

      const response = await uploadReceipt({
        property_id: property.id,
        receipt_type: receiptType,
        amount: amountNum,
        month,
        storage_path: upload.path,
        notes: notes || null,
        replaces_receipt_id: replaceReceiptId || null,
      });

      setSubmittedState({
        receiptId: response.receipt_id,
        propertyLabel,
        receiptType,
        amount,
        month,
        documentName: document.name,
        notes: notes.trim(),
      });
    } catch (e: any) {
      Alert.alert(tr.common.error, e.message || tr.errors.saveFailed);
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = useMemo((): boolean => {
    if (currentStep === 1) return receiptType !== null;
    if (currentStep === 2) return amount.trim().length > 0 && month.length > 0;
    if (currentStep === 3) return document !== null;
    return true;
  }, [amount, currentStep, document, month, receiptType]);

  const goNext = () => {
    if (currentStep === 4) {
      handleUpload();
      return;
    }
    setCurrentStep(prev => prev + 1);
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
    setCurrentStep(prev => prev - 1);
  };

  if (loadingProperty) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backButton} accessibilityLabel={tr.common.back}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{tr.receipts.uploadReceipt}</Text>
          <View style={s.headerSpacer} />
        </View>
        <View style={s.emptyContainer}>
          <Ionicons name="home-outline" size={64} color={theme.colors.textMuted} />
          <Text style={s.emptyText}>{tr.errors.noPropertyAssigned}</Text>
          <Text style={s.emptySubtext}>{tr.tenant.noActiveProperty}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (submittedState) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backButton} accessibilityLabel={tr.common.back}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{tr.receipts.wizard.createdTitle}</Text>
          <View style={s.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={[s.successContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInRight.duration(260)} style={s.successHero}>
            <View style={s.successIconWrap}>
              <Ionicons name="checkmark-circle" size={68} color={theme.colors.success} />
            </View>
            <Text style={s.successTitle}>{tr.receipts.wizard.createdSuccessTitle}</Text>
            <Text style={s.successSubtitle}>{tr.receipts.wizard.createdSuccessSubtitle}</Text>
          </Animated.View>
          <View style={s.summaryShell}>
            <Text style={s.cardTitle}>{tr.receipts.wizard.reviewSummaryTitle}</Text>
            <View style={s.summaryRowLine}>
              <Text style={s.summaryKey}>{tr.receipts.propertyLabel}</Text>
              <Text style={s.summaryText}>{submittedState.propertyLabel}</Text>
            </View>
            <View style={s.summaryRowLine}>
              <Text style={s.summaryKey}>{tr.receipts.paymentType}</Text>
              <Text style={s.summaryText}>{tr.receipts[submittedState.receiptType as keyof typeof tr.receipts] as string}</Text>
            </View>
            <View style={s.summaryRowLine}>
              <Text style={s.summaryKey}>{tr.receipts.amountLabel}</Text>
              <Text style={s.summaryText}>{submittedState.amount} TL</Text>
            </View>
            <View style={s.summaryRowLine}>
              <Text style={s.summaryKey}>{tr.receipts.monthLabel}</Text>
              <Text style={s.summaryText}>{formatMonthDisplay(submittedState.month)}</Text>
            </View>
            <View style={s.summaryRowLine}>
              <Text style={s.summaryKey}>{tr.receipts.document}</Text>
              <Text style={s.summaryText}>{submittedState.documentName}</Text>
            </View>
            {submittedState.notes ? (
              <View style={s.notesSummary}>
                <Text style={s.summaryKey}>{tr.receipts.notes}</Text>
                <Text style={s.notesSummaryText}>{submittedState.notes}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={s.primaryLargeBtn}
            onPress={() =>
              router.replace(
                `/tenant/maintenance?focus=payments&openId=${submittedState.receiptId}&openType=receipt` as any
              )
            }
          >
            <Ionicons name="receipt-outline" size={18} color={theme.colors.textInverse} />
            <Text style={s.primaryLargeBtnText}>{tr.receipts.wizard.createdViewAction}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.secondaryLargeBtn}
            onPress={() => {
              setSubmittedState(null);
              setCurrentStep(1);
              setReceiptType(null);
              setAmount('');
              setMonth(getCurrentMonth());
              setNotes('');
              setDocument(null);
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={s.secondaryLargeBtnText}>{tr.receipts.wizard.createdNewAction}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backButton} accessibilityLabel={tr.common.back}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{tr.receipts.uploadReceipt}</Text>
        <View style={s.headerSpacer} />
      </View>

      <View style={s.heroCard}>
        <Image source={{ uri: property.images?.[0] || propertyImage }} style={s.heroImage} />
        <View style={s.heroOverlay} />
        <View style={s.heroTextWrap}>
          <Text style={s.heroEyebrow}>
            {replaceReceiptId ? tr.receipts.wizard.replaceHeroEyebrow : tr.receipts.wizard.createdHeroEyebrow}
          </Text>
          <Text style={s.heroTitle}>{property.address}</Text>
          <Text style={s.heroSub}>{[property.district, property.city].filter(Boolean).join(', ')}</Text>
        </View>
      </View>

      <StepIndicator
        currentStep={currentStep}
        totalSteps={4}
        labels={[
          tr.receipts.wizard.stepType,
          tr.receipts.wizard.stepAmount,
          tr.receipts.wizard.stepDocument,
          tr.receipts.wizard.stepReview,
        ]}
      />

      {/* Step Content */}
      <KeyboardAwareScrollView
        scrollRef={scrollRef}
        contentContainerStyle={s.stepContent}
        extraBottomSpace={120}
      >
        <Animated.View key={`step-${currentStep}`} entering={FadeInRight.duration(250)} style={s.stepWrap}>

            {/* Mülk Bilgi Kartı — tüm adımlarda görünür */}
          <View style={s.summaryStrip}>
            <View style={s.summaryStripCard}>
              <Text style={s.summaryStripLabel}>{tr.receipts.paymentType}</Text>
              <Text style={s.summaryStripValue} numberOfLines={1}>{typeCardTitle}</Text>
            </View>
            <View style={s.summaryStripCard}>
              <Text style={s.summaryStripLabel}>{tr.receipts.monthLabel}</Text>
              <Text style={s.summaryStripValue}>{month ? formatMonthDisplay(month) : tr.receipts.wizard.selectedNone}</Text>
            </View>
            <View style={s.summaryStripCard}>
              <Text style={s.summaryStripLabel}>{tr.receipts.document}</Text>
              <Text style={s.summaryStripValue}>{document ? tr.receipts.wizard.documentReady : tr.receipts.wizard.documentWaiting}</Text>
            </View>
          </View>

            {/* STEP 1 — Ödeme Tipi */}
            {currentStep === 1 && (
              <View>
                <Text style={s.stepTitle}>{tr.receipts.wizard.typeTitle}</Text>
                <Text style={s.stepSubtitle}>{tr.receipts.wizard.typeSubtitle}</Text>
                <View style={s.typeGrid}>
                  {RECEIPT_TYPES.map(rt => {
                    const isActive = receiptType === rt.key;
                    return (
                      <TouchableOpacity
                        key={rt.key}
                        style={[s.typeCard, isActive && s.typeCardActive]}
                        onPress={() => setReceiptType(rt.key)}
                        accessibilityLabel={tr.receipts[rt.labelKey as keyof typeof tr.receipts] as string}
                      >
                        <View style={[s.typeIconWrap, isActive && s.typeIconWrapActive]}>
                          <MaterialIcons
                            name={rt.icon as any}
                            size={26}
                            color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                          />
                        </View>
                        <Text style={[s.typeLabel, isActive && s.typeLabelActive]}>
                          {tr.receipts[rt.labelKey as keyof typeof tr.receipts] as string}
                        </Text>
                        <Text style={s.typeDetail}>
                          {rt.key === 'rent'
                            ? tr.receipts.wizard.typeRentDetail
                            : rt.key === 'dues'
                            ? tr.receipts.wizard.typeDuesDetail
                            : tr.receipts.wizard.typeOtherDetail}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* STEP 2 — Tutar & Ay */}
            {currentStep === 2 && (
              <View>
                <Text style={s.stepTitle}>{tr.receipts.wizard.amountTitle}</Text>
                <Text style={s.stepSubtitle}>{tr.receipts.wizard.amountSubtitle}</Text>

                <TouchableOpacity activeOpacity={0.85} onPress={() => focusAndScrollToInput(scrollRef, amountInputRef, 96)}>
                  <Text style={s.inputLabel}>{tr.receipts.amount} (TL) *</Text>
                </TouchableOpacity>
                <CurrencyInput
                  ref={amountInputRef as any}
                  inputStyle={s.input}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textMuted}
                  value={amount}
                  onValueChange={setAmount}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onFocus={() => scrollToInput(scrollRef, amountInputRef, 96)}
                  accessibilityLabel={tr.receipts.amountLabel}
                />

                <Text style={s.inputLabel}>{tr.receipts.month} *</Text>
                <TouchableOpacity
                  style={s.monthButton}
                  onPress={() => setIsDatePickerVisible(true)}
                  accessibilityLabel={tr.receipts.wizard.monthPickerLabel}
                >
                  <Text style={month ? s.monthButtonText : s.monthButtonPlaceholder}>
                    {month ? formatMonthDisplay(month) : tr.receipts.wizard.monthPickerPlaceholder}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>

                <View style={s.liveSummaryCard}>
                  <Text style={s.cardTitle}>{tr.receipts.wizard.liveSummaryTitle}</Text>
                  <Text style={s.liveSummaryTitle}>{amount ? `${amount} TL` : tr.receipts.wizard.liveSummaryWaitingAmount}</Text>
                  <Text style={s.liveSummaryBody}>
                    {month
                      ? `${formatMonthDisplay(month)} dönemi için ${typeCardTitle.toLocaleLowerCase('tr-TR')} bildirimi.`
                      : tr.receipts.wizard.liveSummaryWaitingMonth}
                  </Text>
                </View>

                <CompactDatePicker
                  visible={isDatePickerVisible}
                  onClose={() => setIsDatePickerVisible(false)}
                  onSelect={(m) => setMonth(m)}
                  currentValue={month}
                  mode="month"
                  title={tr.receipts.wizard.monthPickerTitle}
                />
              </View>
            )}

            {/* STEP 3 — Belge & Not */}
            {currentStep === 3 && (
              <View>
                <Text style={s.stepTitle}>{tr.receipts.wizard.documentTitle}</Text>
                <Text style={s.stepSubtitle}>{tr.receipts.wizard.documentSubtitle}</Text>

                {document ? (
                  <View style={s.documentPreviewCard}>
                    <View style={s.documentPreviewHeader}>
                      <View style={s.documentBadge}>
                        <Ionicons name={document.type.startsWith('image/') ? 'image-outline' : 'document-text-outline'} size={18} color={theme.colors.primary} />
                        <Text style={s.documentBadgeText}>
                          {document.type.startsWith('image/') ? tr.receipts.wizard.imageBadge : tr.receipts.wizard.pdfBadge}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={s.documentRemoveAction}
                        onPress={() => setDocument(null)}
                        accessibilityLabel={tr.receipts.wizard.removeDocumentAction}
                      >
                        <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                    {document.type.startsWith('image/') ? (
                      <Image source={{ uri: document.uri }} style={s.previewImage} resizeMode="cover" />
                    ) : (
                      <View style={s.pdfPreview}>
                        <Ionicons name="document-text-outline" size={52} color={theme.colors.primary} />
                        <Text style={s.pdfName} numberOfLines={2}>{document.name}</Text>
                      </View>
                    )}
                    <View style={s.documentMetaRow}>
                      <Text style={s.documentName} numberOfLines={2}>{document.name}</Text>
                      <Text style={s.documentHint}>{document.size ? `${Math.max(1, Math.round(document.size / 1024))} KB` : tr.receipts.wizard.documentReadyHint}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={s.uploadButtonsColumn}>
                    <TouchableOpacity style={s.uploadBtn} onPress={takePhoto} accessibilityLabel={tr.receipts.takePhoto}>
                      <Ionicons name="camera-outline" size={26} color={theme.colors.primary} />
                      <View style={s.uploadCopy}>
                        <Text style={s.uploadBtnTitle}>{tr.receipts.takePhoto}</Text>
                        <Text style={s.uploadBtnText}>{tr.receipts.wizard.takePhotoDetail}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.uploadBtn} onPress={pickImage} accessibilityLabel={tr.receipts.fromGallery}>
                      <Ionicons name="images-outline" size={26} color={theme.colors.primary} />
                      <View style={s.uploadCopy}>
                        <Text style={s.uploadBtnTitle}>{tr.receipts.fromGallery}</Text>
                        <Text style={s.uploadBtnText}>{tr.receipts.wizard.fromGalleryDetail}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.uploadBtn} onPress={pickDocument} accessibilityLabel={tr.receipts.pickPDF}>
                      <Ionicons name="document-outline" size={26} color={theme.colors.primary} />
                      <View style={s.uploadCopy}>
                        <Text style={s.uploadBtnTitle}>{tr.receipts.pickPDF}</Text>
                        <Text style={s.uploadBtnText}>{tr.receipts.wizard.pickPdfDetail}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity activeOpacity={0.85} onPress={() => focusAndScrollToInput(scrollRef, notesInputRef, 140)}>
                  <Text style={s.inputLabel}>{tr.receipts.notes}</Text>
                </TouchableOpacity>
                <TextInput
                  ref={notesInputRef}
                  style={[s.input, s.textArea]}
                  placeholder={tr.receipts.wizard.notesPlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  onFocus={() => scrollToInput(scrollRef, notesInputRef, 140)}
                  accessibilityLabel={tr.receipts.notesTitle}
                />
              </View>
            )}

            {/* STEP 4 — Özet */}
            {currentStep === 4 && (
              <View>
                <Text style={s.stepTitle}>{tr.receipts.wizard.reviewTitle}</Text>
                <Text style={s.stepSubtitle}>{tr.receipts.wizard.reviewSubtitle}</Text>
                <View style={s.summaryShell}>
                  <Text style={s.cardTitle}>{tr.receipts.wizard.reviewSummaryTitle}</Text>
                  <View style={s.summaryRowLine}>
                    <Text style={s.summaryKey}>{tr.receipts.paymentType}</Text>
                    <Text style={s.summaryText}>{typeCardTitle}</Text>
                  </View>
                  <View style={s.summaryRowLine}>
                    <Text style={s.summaryKey}>{tr.receipts.amountLabel}</Text>
                    <Text style={s.summaryText}>{amount ? `${amount} TL` : '-'}</Text>
                  </View>
                  <View style={s.summaryRowLine}>
                    <Text style={s.summaryKey}>{tr.receipts.monthLabel}</Text>
                    <Text style={s.summaryText}>{month ? formatMonthDisplay(month) : '-'}</Text>
                  </View>
                  <View style={s.summaryRowLine}>
                    <Text style={s.summaryKey}>{tr.receipts.document}</Text>
                    <Text style={s.summaryText}>{document?.name || '-'}</Text>
                  </View>
                  <View style={s.notesSummary}>
                    <Text style={s.summaryKey}>{tr.receipts.notes}</Text>
                    <Text style={s.notesSummaryText}>{notesPreview}</Text>
                  </View>
                </View>
              </View>
            )}

        </Animated.View>
      </KeyboardAwareScrollView>

      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={s.footerRow}>
          {currentStep > 1 ? (
            <TouchableOpacity style={s.backBtn} onPress={goBack} accessibilityLabel={tr.common.back}>
              <Ionicons name="arrow-back" size={18} color={theme.colors.primary} />
              <Text style={s.backBtnText}>{tr.common.back}</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.footerSpacer} />
          )}
          <TouchableOpacity
            style={[s.nextBtn, (!canGoNext || loading) && s.nextBtnDisabled]}
            onPress={goNext}
            disabled={!canGoNext || loading}
            accessibilityLabel={currentStep === 4 ? tr.receipts.wizard.submitAction : tr.common.next}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <Text style={s.nextBtnText}>{currentStep === 4 ? tr.receipts.wizard.submitAction : tr.common.next}</Text>
                <Ionicons name="arrow-forward" size={18} color={theme.colors.textInverse} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxxl,
  },
  emptyText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  stepContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },

  // Mülk Kartı
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  propertyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyDetails: {
    flex: 1,
  },
  propertyAddress: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  propertyCity: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // Step Titles
  stepTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },

  // Step 1 — Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  typeCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 44,
  },
  typeCardActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  typeLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: theme.colors.primary,
  },

  // Step 2 — Inputs
  inputLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.base,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: theme.spacing.md,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 50,
  },
  monthButtonText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  monthButtonPlaceholder: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textMuted,
  },

  // Step 3 — Document
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 44,
  },
  uploadBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  },
  documentPreview: {
    position: 'relative',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  previewImage: {
    width: '100%',
    height: 240,
  },
  pdfPreview: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  pdfName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: theme.borderRadius.round,
  },

  // Step 4 — Summary
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  summaryValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  backBtnText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  nextBtn: {
    flex: 1,
    height: 50,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    height: 156,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayStrong,
  },
  heroTextWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  heroEyebrow: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
    color: theme.colors.textInverse,
    opacity: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textInverse,
  },
  heroSub: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textInverse,
    opacity: 0.9,
    marginTop: 4,
  },
  legacyStepContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  stepWrap: {
    flex: 1,
  },
  summaryStrip: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  summaryStripCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  summaryStripLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  summaryStripValue: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  stepSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  legacyTypeCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 44,
    ...theme.shadows.sm,
  },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIconWrapActive: {
    backgroundColor: theme.colors.surface,
  },
  typeDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  legacyInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.base,
    color: theme.colors.textPrimary,
    ...theme.shadows.sm,
  },
  liveSummaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  liveSummaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  liveSummaryBody: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  uploadButtonsColumn: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  legacyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 44,
  },
  uploadCopy: {
    flex: 1,
  },
  uploadBtnTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  legacyUploadBtnText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'left',
  },
  documentPreviewCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  documentPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  documentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  documentBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  documentRemoveAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legacyPreviewImage: {
    width: '100%',
    height: 220,
  },
  legacyPdfPreview: {
    width: '100%',
    height: 190,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  documentMetaRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  documentName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  documentHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  summaryShell: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  summaryRowLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  summaryKey: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  summaryText: {
    flex: 1,
    textAlign: 'right',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  notesSummary: {
    marginTop: theme.spacing.lg,
  },
  notesSummaryText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  successContent: {
    padding: theme.spacing.xl,
  },
  successHero: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: theme.spacing.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  successIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  successTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: theme.spacing.sm,
  },
  legacyBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  footerSpacer: {
    width: 92,
  },
  legacyBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 92,
    height: 52,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.sm,
  },
  legacyNextBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryLargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  primaryLargeBtnText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textInverse,
  },
  secondaryLargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  secondaryLargeBtnText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
}));
