import React from 'react';
import type { AdCampaign } from '@shared/campaign';

interface Props {
  data: Partial<AdCampaign>;
}

export function PreviewInlineAd({ data }: Props) {
  return (
    <div className="mob-card">
      <div className="mob-img" style={{ height: 120 }}>
        {data.image_url ? (
          <img src={data.image_url} alt="Preview" className="mob-img" style={{ height: 120, objectFit: 'cover' }} />
        ) : (
          <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#E9ECEF', gap: 4 }}>
            <span className="material-icons" style={{ fontSize: 28, color: '#adb5bd' }}>image</span>
            <span style={{ fontSize: 10, color: '#adb5bd' }}>Görsel eklenmedi</span>
          </div>
        )}
      </div>
      <div className="mob-info">
        <div className="mob-title">{data.title || 'Kampanya Başlığı'}</div>
        <div className="mob-sub">{data.body || 'Kampanya açıklaması burada görünecektir...'}</div>
        <button className="mob-btn">Detayı Gör</button>
      </div>
    </div>
  );
}
