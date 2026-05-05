import React from 'react';
import type { AdCampaign } from '@shared/campaign';
import { AdvertiserFields } from '../AdvertiserFields';

interface Props {
  data: Partial<AdCampaign>;
  onChange: (updates: Partial<AdCampaign>) => void;
}

export function ServiceFields({ data, onChange }: Props) {
  return (
    <div className="space-y-16">
      <div className="card" style={{ padding: '24px' }}>
        <div className="flex items-center gap-8 mb-24" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <span className="material-icons" style={{ color: 'var(--primary)' }}>handshake</span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Servis Ortağı Bilgileri</h3>
            <p className="help-text">Bu kart, dashboard'da servis ortakları bölümünde ikon ve başlıkla listelenir.</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            MaterialIcons İkon Adı <span className="required">*</span>
          </label>
          <span className="help-text">
            Servis kartının sol tarafında gösterilecek ikon. Örnek değerler: <strong>local_shipping</strong>, <strong>build</strong>, <strong>cleaning_services</strong>, <strong>electrical_services</strong>.
            Tam liste için <a href="https://fonts.google.com/icons" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>fonts.google.com/icons</a> adresini ziyaret edin.
          </span>
          <div className="flex items-center gap-12 mt-8">
            <input
              type="text"
              className="form-control"
              value={data.service_icon || ''}
              onChange={(e) => onChange({ service_icon: e.target.value })}
              placeholder="Örn: local_shipping"
              style={{ flex: 1 }}
            />
            <span
              className="material-icons"
              style={{
                fontSize: 36,
                color: data.service_icon ? 'var(--primary)' : 'var(--border)',
                transition: 'color 0.2s',
                flexShrink: 0,
              }}
            >
              {data.service_icon || 'image_not_supported'}
            </span>
          </div>
        </div>

        <div className="form-group mt-16">
          <label className="form-label">
            Servis Başlığı <span className="required">*</span>
          </label>
          <span className="help-text">Kartın ana metni — kısa ve akılda kalıcı bir servis adı girin (ör: "7/24 Tesisatçı").</span>
          <input
            type="text"
            className="form-control"
            value={data.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Örn: 7/24 Acil Tesisatçı"
          />
        </div>

        <div className="form-group mt-16">
          <label className="form-label">Tıklama Linki (CTA URL)</label>
          <span className="help-text">Kullanıcı kartı tıkladığında açılacak web adresi. Boş bırakılırsa kart tıklanamaz olur.</span>
          <input
            type="url"
            className="form-control"
            value={data.link_url || ''}
            onChange={(e) => onChange({ link_url: e.target.value })}
            placeholder="https://servisortagi.com"
          />
        </div>
      </div>

      <AdvertiserFields data={data} onChange={onChange} />
    </div>
  );
}
