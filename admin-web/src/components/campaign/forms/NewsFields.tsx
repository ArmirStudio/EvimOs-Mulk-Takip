import React from 'react';
import type { AdCampaign } from '@shared/campaign';
import { ImageUpload } from '../ImageUpload';
import { AdvertiserFields } from '../AdvertiserFields';

interface Props {
  data: Partial<AdCampaign>;
  onChange: (updates: Partial<AdCampaign>) => void;
}

export function NewsFields({ data, onChange }: Props) {
  return (
    <div className="space-y-16">
      <div className="card" style={{ padding: '24px' }}>
        <div className="flex items-center gap-8 mb-24" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <span className="material-icons" style={{ color: 'var(--primary)' }}>article</span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Emlak Haberi Bilgileri</h3>
            <p className="help-text">Bu alan, mobil uygulamanın 'Haberler' bölümünde dikey listelenen bir kart olarak görünür.</p>
          </div>
        </div>
        
        <ImageUpload 
          label="Haber Görseli (Küçük Resim)" 
          value={data.image_url || ''} 
          onChange={(url) => onChange({ image_url: url })}
          aspectHint="Önerilen Boyut: 300x300px (Birebir Kare Oranı). Bu görsel haberin sol tarafında kare olarak gösterilir."
          folder="news"
        />

        <div className="form-group mt-24">
          <label className="form-label">
            Haber Başlığı <span className="required">*</span>
          </label>
          <span className="help-text">Kısa ve ilgi çekici bir haber başlığı (Maks: 50 karakter önerilir).</span>
          <input 
            type="text" 
            className="form-control mt-4"
            value={data.title || ''} 
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Kısa ve öz bir başlık girin..."
            required
          />
        </div>

        <div className="form-group mt-16">
          <label className="form-label">Haber Özeti</label>
          <span className="help-text">Kullanıcının dikkatinin çekileceği ilk iki cümlenin yer aldığı kısa özet.</span>
          <textarea 
            className="form-control mt-4"
            value={data.body || ''} 
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Örn: Yeni çıkarılan emlak yasasına göre ev sahipleri..."
          />
        </div>

        <div className="form-group mt-16">
          <label className="form-label">Detay Linki ("Devamını Oku" Butonu URL'si)</label>
          <span className="help-text">Kulllanıcı bu habere dokunduğunda yönlendirileceği makale bağlantısı.</span>
          <input 
            type="url" 
            className="form-control mt-4"
            value={data.link_url || ''} 
            onChange={(e) => onChange({ link_url: e.target.value })}
            placeholder="https://haber-sitesi.com/haber-adresi"
          />
        </div>
      </div>

      <AdvertiserFields data={data} onChange={onChange} />
    </div>
  );
}
