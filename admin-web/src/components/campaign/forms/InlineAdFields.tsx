import React from 'react';
import type { AdCampaign } from '@shared/campaign';
import { ImageUpload } from '../ImageUpload';
import { AdvertiserFields } from '../AdvertiserFields';

interface Props {
  data: Partial<AdCampaign>;
  onChange: (updates: Partial<AdCampaign>) => void;
}

export function InlineAdFields({ data, onChange }: Props) {
  return (
    <div className="space-y-16">
      <div className="card" style={{ padding: '24px' }}>
        <div className="flex items-center gap-8 mb-24" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <span className="material-icons" style={{ color: 'var(--primary)' }}>campaign</span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>İçerik Reklamı Bilgileri</h3>
            <p className="help-text">Bu alan, mobil uygulamada mülk listeleri arasına yatay bir afiş (banner) olarak yerleşir.</p>
          </div>
        </div>
        
        <ImageUpload 
          label="Hero Görseli (Ana Afiş)" 
          value={data.image_url || ''} 
          onChange={(url) => onChange({ image_url: url })}
          aspectHint="Önerilen Boyut: 1200x600px (2:1 Oran). Yüksek kaliteli yatay bir görsel kullanın."
          folder="ads/inline"
        />

        <div className="form-group mt-24">
          <label className="form-label">
            Reklam Başlığı <span className="required">*</span>
          </label>
          <span className="help-text">Görselin hemen altında kalın harflerle görünen dikkat çekici ana başlık.</span>
          <input 
            type="text" 
            className="form-control"
            value={data.title || ''} 
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Örn: %20 İndirim Fırsatını Kaçırmayın!"
            required
          />
        </div>

        <div className="form-group mt-16">
          <label className="form-label">Alt Açıklama Metni</label>
          <span className="help-text">Başlığın altındaki daha küçük boyutlu açıklayıcı metindir (isteğe bağlı).</span>
          <textarea 
            className="form-control"
            value={data.body || ''} 
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Kampanyanın detayları, geçerlilik süresi vb..."
          />
        </div>

        <div className="form-group mt-16">
          <label className="form-label">Harekete Geçirici Link (CTA URL)</label>
          <span className="help-text">Kullanıcı "Detayı Gör" butonuna bastığında açılacak web sitesi veya yönlendirme bağlantısı.</span>
          <input 
            type="url" 
            className="form-control"
            value={data.link_url || ''} 
            onChange={(e) => onChange({ link_url: e.target.value })}
            placeholder="https://sirketiniz.com/kampanya"
          />
        </div>
      </div>

      <AdvertiserFields data={data} onChange={onChange} />
    </div>
  );
}
