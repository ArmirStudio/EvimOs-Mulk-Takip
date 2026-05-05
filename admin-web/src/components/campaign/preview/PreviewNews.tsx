import React from 'react';
import type { AdCampaign } from '@shared/campaign';

interface Props {
  data: Partial<AdCampaign>;
}

export function PreviewNews({ data }: Props) {
  return (
    <div className="mob-news-card">
      <div className="mob-news-img">
        {data.image_url ? (
          <img src={data.image_url} alt="Haber" className="mob-news-img" />
        ) : (
          <div style={{ width: 96, height: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span className="material-icons" style={{ fontSize: 24, color: '#adb5bd' }}>article</span>
            <span style={{ fontSize: 9, color: '#adb5bd' }}>Görsel yok</span>
          </div>
        )}
      </div>
      <div className="mob-news-content">
        <div>
          <div className="mob-title" style={{ fontSize: 13 }}>{data.title || 'Haber Başlığı'}</div>
          <div className="mob-sub" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {data.body || 'Haber içeriği burada görünecektir...'}
          </div>
        </div>
        <span className="mob-news-link">Devamını Oku →</span>
      </div>
    </div>
  );
}
