import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import CompanyFormScreen, {
  EMPTY_COMPANY_FORM,
  type CompanyEntityType,
  type CompanyFormValues,
} from '../../components/Admin/CompanyFormScreen';
import { tr } from '../translations';
import { createAdminAgency, uploadAdminPublicFile } from '../../services/appApi';

const TRIAL_PASSWORD = '1234';

function isRemoteAsset(value: string | null) {
  return !!value && /^https?:\/\//i.test(value);
}

async function uploadBrandAsset(kind: 'logo' | 'banner', source: string | null) {
  if (!source || isRemoteAsset(source)) {
    return source;
  }

  const folder = kind === 'logo' ? 'logos' : 'banners';
  const upload = await uploadAdminPublicFile({
    bucket: 'agency-branding',
    path: `${folder}/new/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`,
    fileUri: source,
    contentType: 'image/jpeg',
    upsert: true,
    folder,
  });

  return upload.public_url;
}

export default function CreateCompanyScreen() {
  const { entityType } = useLocalSearchParams<{ entityType?: CompanyEntityType }>();
  const [saving, setSaving] = useState(false);

  const initialValues = useMemo<CompanyFormValues>(
    () => ({
      ...EMPTY_COMPANY_FORM,
      entityType: entityType === 'company' ? 'company' : 'office',
    }),
    [entityType]
  );

  const screenTitle = initialValues.entityType === 'company' ? 'Yeni Şirket Oluştur' : 'Yeni Ofis Oluştur';

  const handleSubmit = async (values: CompanyFormValues) => {
    setSaving(true);

    try {
      const [logoUrl, bannerUrl] = await Promise.all([
        uploadBrandAsset('logo', values.logoUrl),
        uploadBrandAsset('banner', values.bannerUrl),
      ]);

      await createAdminAgency({
        entity_type: values.entityType,
        name: values.name,
        location: values.location,
        district: values.district || null,
        address: values.address || null,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        brand_color_primary: values.brandColorPrimary,
        brand_color_secondary: values.brandColorSecondary,
        active_regions: values.activeRegions,
        subscription_plan: values.subscriptionPlan,
        max_properties: parseInt(values.maxProperties, 10) || 20,
        contract_start: values.contractStart || null,
        contract_end: values.contractEnd || null,
        contact_email: values.contactEmail,
        contact_phone: values.contactPhone || null,
        notes: values.notes || null,
        status: values.status,
        agent_password: TRIAL_PASSWORD,
      });

      Alert.alert(
        tr.common.success,
        `${values.name} oluşturuldu. Giriş e-postası: ${values.contactEmail} | Varsayılan şifre: ${TRIAL_PASSWORD}`,
        [{ text: tr.common.ok, onPress: () => router.replace('/admin/companies') }]
      );
    } catch (submissionError: any) {
      console.error('Create company error:', submissionError);
      Alert.alert(tr.common.error, submissionError?.message || 'Kayıt kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CompanyFormScreen
      title={screenTitle}
      submitLabel={tr.admin.saveCompany}
      initialValues={initialValues}
      saving={saving}
      collectDistrict
      onSubmit={handleSubmit}
    />
  );
}
