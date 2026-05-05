import React from 'react';
import { ImageUpload } from './ImageUpload';
import type { AdCampaign } from '@shared/campaign';

interface Props {
  data: Partial<AdCampaign>;
  onChange: (updates: Partial<AdCampaign>) => void;
  collapsible?: boolean;
}

export function AdvertiserFields({ data, onChange, collapsible = true }: Props) {
  const [isOpen, setIsOpen] = React.useState(!collapsible);

  return (
    <div className={`card ${collapsible ? 'collapsible' : ''} ${isOpen ? 'open' : ''}`} style={{ padding: isOpen ? '24px' : '0' }}>
      {collapsible && (
        <div 
          className="flex items-center justify-between pointer" 
          onClick={() => setIsOpen(!isOpen)}
          style={{ padding: isOpen ? '0 0 16px 0' : '20px 24px', borderBottom: isOpen ? '1px solid var(--border)' : 'none' }}
        >
          <div className="flex items-center gap-8">
            <span className="material-icons" style={{ color: 'var(--text-muted)' }}>business</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Reklamveren / Şirket Bilgileri</h3>
          </div>
          <span className="material-icons" style={{ color: 'var(--text-muted)' }}>{isOpen ? 'expand_less' : 'expand_more'}</span>
        </div>
      )}
      
      {isOpen && (
        <div className="mt-24">
          <p className="help-text mb-24">Eğer bu kampanya dışarıdan bir şirkete veya sponsora aitse, bu bilgileri doldurmanız kampanyanın güvenirliğini artırır.</p>
          
          <div className="flex gap-24 flex-wrap">
            <div style={{ flex: 1, minWidth: '200px' }}>
              <ImageUpload 
                label="Şirket Logosu" 
                value={data.company_logo || ''} 
                onChange={(url) => onChange({ company_logo: url })}
                aspectHint="Önerilen: 200x200px (Kare formatta şirket logosu)"
                circular
              />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <ImageUpload 
                label="Sponsor Görseli (Opsiyonel)" 
                value={data.company_banner || ''} 
                onChange={(url) => onChange({ company_banner: url })}
                aspectHint="Önerilen: 600x200px (Varsa ek promosyon afişi)"
              />
            </div>
          </div>

          <div className="form-group mt-16">
            <label className="form-label">Şirket Adı / Marka</label>
            <input 
              type="text" 
              className="form-control"
              value={data.company_name || ''} 
              onChange={(e) => onChange({ company_name: e.target.value })}
              placeholder="Örn: XYZ İnşaat A.Ş."
            />
          </div>

          <div className="form-group mt-16">
            <label className="form-label">Kurumsal Açıklama</label>
            <textarea 
              className="form-control"
              value={data.company_description || ''} 
              onChange={(e) => onChange({ company_description: e.target.value })}
              placeholder="Şirketin faaliyet alanı veya kısaca 'Hakkımızda' bilgisi..."
            />
          </div>

          <div className="flex gap-16 mt-16 flex-wrap">
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">İletişim E-postası</label>
              <input 
                type="email" 
                className="form-control"
                value={data.contact_email || ''} 
                onChange={(e) => onChange({ contact_email: e.target.value })}
                placeholder="info@sirket.com"
              />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Telefon Numarası</label>
              <input 
                type="tel" 
                className="form-control"
                value={data.contact_phone || ''} 
                onChange={(e) => onChange({ contact_phone: e.target.value })}
                placeholder="0212..."
              />
            </div>
          </div>

          <div className="form-group mt-16">
            <label className="form-label">Fiziksel Adres</label>
            <textarea 
              className="form-control"
              value={data.contact_address || ''} 
              onChange={(e) => onChange({ contact_address: e.target.value })}
              placeholder="Merkez ofis adresi veya şube adresi..."
              style={{ minHeight: '60px' }}
            />
          </div>

          <div className="form-group mt-16">
            <label className="form-label">Kurumsal Web Sitesi</label>
            <input 
              type="url" 
              className="form-control"
              value={data.contact_website || ''} 
              onChange={(e) => onChange({ contact_website: e.target.value })}
              placeholder="https://www.sirket.com"
            />
          </div>
        </div>
      )}
    </div>
  );
}
