import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CampaignScheduling } from '../components/campaign/CampaignScheduling';
import { CampaignTargeting } from '../components/campaign/CampaignTargeting';
import CampaignTypeSelector from '../components/campaign/CampaignTypeSelector';
import { InlineAdFields } from '../components/campaign/forms/InlineAdFields';
import { InterstitialFields } from '../components/campaign/forms/InterstitialFields';
import { NewsFields } from '../components/campaign/forms/NewsFields';
import { ServiceFields } from '../components/campaign/forms/ServiceFields';
import { TestimonialFields } from '../components/campaign/forms/TestimonialFields';
import { PhonePreview } from '../components/campaign/preview/PhonePreview';
import { createAdminCampaign, getAdminCampaign, updateAdminCampaign } from '../lib/api';
import type { AdCampaign, CampaignType } from '@shared/campaign';

const INITIAL_STATE: Partial<AdCampaign> = {
  type: 'inline_ad',
  title: '',
  body: '',
  image_url: '',
  link_url: '',
  sort_order: 0,
  active: true,
  target_roles: ['agent', 'landlord', 'tenant', 'employee'],
  target_provinces: [],
  target_agency_ids: [],
  client_rating: 5,
  daily_frequency: 1,
  lock_duration: 0,
  modal_width_pct: 85,
  image_height_pct: 35,
  start_hour: 7,
};

export default function CampaignForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();

  const [data, setData] = useState<Partial<AdCampaign>>(INITIAL_STATE);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) {
      return;
    }

    const loadCampaign = async () => {
      try {
        const response = await getAdminCampaign(id);
        setData(response.campaign);
      } catch {
        alert('Kampanya bulunamadi.');
        nav('/');
      } finally {
        setLoading(false);
      }
    };

    void loadCampaign();
  }, [id, isEdit, nav]);

  const updateData = (updates: Partial<AdCampaign>) => {
    setData((previous) => ({ ...previous, ...updates }));
  };

  const handleSave = async () => {
    if (!data.title?.trim() && data.type !== 'testimonial') {
      alert('Lutfen kampanya basligini girin.');
      return;
    }
    if (!data.target_roles || data.target_roles.length === 0) {
      alert('Lutfen en az bir hedef kitle secin.');
      return;
    }
    if (data.type === 'testimonial' && !data.client_name?.trim()) {
      alert('Lutfen musteri adini girin.');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...data } as Partial<AdCampaign> & Record<string, unknown>;
      delete payload.created_at;
      delete payload.updated_at;
      if (!isEdit) {
        delete payload.id;
      }

      if (data.type !== 'interstitial') {
        delete payload.lock_duration;
        delete payload.modal_width_pct;
        delete payload.image_height_pct;
        delete payload.start_hour;
        delete payload.daily_frequency;
      }

      if (isEdit && id) {
        await updateAdminCampaign(id, payload);
      } else {
        await createAdminCampaign(payload as AdCampaign & { type: CampaignType });
      }

      nav('/');
    } catch (error: any) {
      console.error('Save error:', error);
      alert(`Kaydedilirken bir hata olustu: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" />
        <p>Yukleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky-header sticky-header-row">
        <div>
          <h1>{isEdit ? 'Kampanyayi Duzenle' : 'Yeni Kampanya'}</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Reklam icerigi, hedefleme ve canli onizleme
          </p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={() => nav('/')} disabled={saving}>
            Iptal
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <span className="material-icons">save</span>
            {saving ? 'Kaydediliyor...' : 'Kampanyayi Kaydet'}
          </button>
        </div>
      </div>

      <div className="campaign-grid campaign-form-page">
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              1. Kampanya Turu
            </span>
          </div>
          <CampaignTypeSelector
            selected={data.type as CampaignType}
            onChange={(type: CampaignType) => updateData({ type })}
            disabled={isEdit}
          />

          <div style={{ margin: '24px 0 6px' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              2. Icerik ve Hedefleme
            </span>
          </div>
          {data.type === 'inline_ad' && <InlineAdFields data={data} onChange={updateData} />}
          {data.type === 'news' && <NewsFields data={data} onChange={updateData} />}
          {data.type === 'testimonial' && <TestimonialFields data={data} onChange={updateData} />}
          {data.type === 'service' && <ServiceFields data={data} onChange={updateData} />}
          {data.type === 'interstitial' && <InterstitialFields data={data} onChange={updateData} />}

          <div className="mt-24">
            <CampaignTargeting data={data} onChange={updateData} />
          </div>

          <div style={{ margin: '24px 0 6px' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              3. Yayin Takvimi
            </span>
          </div>
          <CampaignScheduling data={data} onChange={updateData} />
        </div>

        <aside className="campaign-col-preview">
          <div className="sticky-preview">
            <PhonePreview data={data} />
          </div>
        </aside>
      </div>
    </div>
  );
}
