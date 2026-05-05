import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import CompanyFormScreen, {
  EMPTY_COMPANY_FORM,
  type CompanyFormValues,
} from '../../components/Admin/CompanyFormScreen';
import { tr } from '../translations';
import { getAdminAgency, updateAdminAgency, uploadAdminPublicFile } from '../../services/appApi';
import {
  resolveSupabaseStorageUrl,
} from '../../services/supabaseStorage';

function isRemoteAsset(value: string | null) {
  return !!value && /^https?:\/\//i.test(value);
}

function normalizeActiveRegions(regions: string[] | null | undefined) {
  return [...new Set((regions || []).map((item) => item.split('/')[0]?.trim()).filter(Boolean))];
}

async function uploadBrandAsset(agencyId: string, kind: 'logo' | 'banner', source: string | null) {
  if (!source || isRemoteAsset(source)) {
    return source;
  }

  const folder = kind === 'logo' ? 'logos' : 'banners';
  const upload = await uploadAdminPublicFile({
    bucket: 'agency-branding',
    path: `${folder}/${agencyId}/${Date.now()}.jpg`,
    fileUri: source,
    contentType: 'image/jpeg',
    upsert: true,
    folder,
  });

  return upload.public_url;
}

export default function EditCompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialValues, setInitialValues] = useState<CompanyFormValues>(EMPTY_COMPANY_FORM);
  const agencyId = useMemo(() => (typeof id === 'string' ? id : ''), [id]);

  const loadCompany = useCallback(async () => {
    if (!agencyId) {
      Alert.alert(tr.common.error, tr.admin.companyNotFound);
      router.back();
      return;
    }

    try {
      setLoading(true);
      const response = await getAdminAgency(agencyId);
      const data = response.agency;

      if (!data) {
        Alert.alert(tr.common.error, tr.admin.companyNotFound);
        router.back();
        return;
      }

      setInitialValues({
        entityType: data.entity_type === 'company' ? 'company' : 'office',
        name: data.name || '',
        location: data.location || '',
        district: '',
        address: data.address || '',
        logoUrl: resolveSupabaseStorageUrl('agency-branding', data.logo_url),
        bannerUrl: resolveSupabaseStorageUrl('agency-branding', data.banner_url),
        brandColorPrimary: data.brand_color_primary || EMPTY_COMPANY_FORM.brandColorPrimary,
        brandColorSecondary: data.brand_color_secondary || EMPTY_COMPANY_FORM.brandColorSecondary,
        activeRegions: normalizeActiveRegions(data.active_regions),
        subscriptionPlan: data.subscription_plan || EMPTY_COMPANY_FORM.subscriptionPlan,
        maxProperties: String(data.max_properties || 20),
        contractStart: data.contract_start || null,
        contractEnd: data.contract_end || null,
        contactEmail: data.contact_email || '',
        contactPhone: data.contact_phone || '',
        notes: data.notes || '',
        status: data.status || 'active',
      });
    } catch (loadError) {
      console.error('Load company error:', loadError);
      Alert.alert(tr.common.error, 'Şirket yüklenirken hata oluştu');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const handleSubmit = async (values: CompanyFormValues) => {
    if (!agencyId) {
      return;
    }

    setSaving(true);
    try {
      const [logoUrl, bannerUrl] = await Promise.all([
        uploadBrandAsset(agencyId, 'logo', values.logoUrl),
        uploadBrandAsset(agencyId, 'banner', values.bannerUrl),
      ]);

      await updateAdminAgency(agencyId, {
        entity_type: values.entityType,
        name: values.name,
        location: values.location,
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
      });

      Alert.alert(tr.common.success, tr.admin.companySaved, [
        { text: tr.common.ok, onPress: () => router.back() },
      ]);
    } catch (submissionError: any) {
      console.error('Edit company error:', submissionError);
      Alert.alert(tr.common.error, submissionError?.message || 'Şirket güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CompanyFormScreen
      title={initialValues.entityType === 'company' ? 'Şirket Düzenle' : 'Ofis Düzenle'}
      submitLabel={tr.common.save}
      initialValues={initialValues}
      loading={loading}
      saving={saving}
      onSubmit={handleSubmit}
    />
  );
}
