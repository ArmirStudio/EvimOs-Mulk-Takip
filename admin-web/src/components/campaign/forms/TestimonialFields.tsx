import React from 'react';
import type { AdCampaign } from '@shared/campaign';
import { ImageUpload } from '../ImageUpload';

interface Props {
  data: Partial<AdCampaign>;
  onChange: (updates: Partial<AdCampaign>) => void;
}

export function TestimonialFields({ data, onChange }: Props) {
  return (
    <div className="card" style={{ padding: '24px' }}>
      <div className="flex items-center gap-8 mb-24" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <span className="material-icons" style={{ color: 'var(--primary)' }}>star</span>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Müşteri Görüşü (Testimonial) Bilgileri</h3>
          <p className="help-text">Memnun müşterilerinizin yorumlarını uygulamanın ana ekranında referans olarak gösterin.</p>
        </div>
      </div>

      <div className="form-group mb-24">
        <label className="form-label">Dahili Başlık (Opsiyonel)</label>
        <span className="help-text">Kampanya listesinde görünecek kısa etiket. Uygulamada gösterilmez.</span>
        <input
          type="text"
          className="form-control mt-4"
          value={data.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Örn: Ahmet Bey Yorumu — Mayıs 2025"
        />
      </div>

      <ImageUpload
        label="Müşteri Profil Fotoğrafı (Opsiyonel)"
        value={data.client_avatar || ''}
        onChange={(url) => onChange({ client_avatar: url })}
        aspectHint="1:1 Kare veya Yuvarlak format (Örn: 150x150px)"
        circular
      />

      <div className="form-group mt-24">
        <label className="form-label">
          Müşteri Adı Soyadı <span className="required">*</span>
        </label>
        <span className="help-text">Yorumu yapan kişinin veya kurum yetkilisinin adı.</span>
        <input 
          type="text" 
          className="form-control"
          value={data.client_name || ''} 
          onChange={(e) => onChange({ client_name: e.target.value })}
          placeholder="Örn: Ahmet Yılmaz"
          required
        />
      </div>

      <div className="flex gap-16 mt-16 flex-wrap">
        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
          <label className="form-label">Unvanı / Mesleği</label>
          <input 
            type="text" 
            className="form-control"
            value={data.client_title || ''} 
            onChange={(e) => onChange({ client_title: e.target.value })}
            placeholder="Örn: CEO / Mimar"
          />
        </div>
        
        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
          <label className="form-label">Çalıştığı Şirket (Opsiyonel)</label>
          <input 
            type="text" 
            className="form-control"
            value={data.client_company || ''} 
            onChange={(e) => onChange({ client_company: e.target.value })}
            placeholder="Örn: ABC Mimarlık"
          />
        </div>
      </div>

      <div className="form-group mt-16">
        <label className="form-label">Yıldız Puanı (1-5)</label>
        <span className="help-text">Müşterinin verdiği memnuniyet puanı. 1 ile 5 arasında ondalıklı giriş yapılabilir (Örn: 4.5).</span>
        <div className="flex items-center gap-12 mt-4">
          <input 
            type="number" 
            className="form-control"
            value={data.client_rating ?? 5} 
            onChange={(e) => onChange({ client_rating: parseFloat(e.target.value) || 5 })}
            min={1} max={5} step={0.5}
            style={{ width: '100px' }}
          />
          <div className="flex" style={{ color: '#FFB300' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="material-icons" style={{ fontSize: 28 }}>
                {i < Math.floor(data.client_rating ?? 5) ? 'star' : 
                 (data.client_rating ?? 5) % 1 >= 0.5 && i === Math.floor(data.client_rating ?? 5) ? 'star_half' : 'star_border'}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="form-group mt-24">
        <label className="form-label">Müşteri Yorumu (Alıntı)</label>
        <span className="help-text">Müşterinin uygulamamız veya hizmetimiz hakkındaki görüşü. Tırnak işaretleri otomatik eklenir.</span>
        <textarea 
          className="form-control mt-4"
          value={data.body || ''} 
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="Bu sistem sayesinde mülklerimi çok daha rahat yönetiyorum..."
          rows={4}
        />
      </div>
    </div>
  );
}
