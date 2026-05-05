import React from 'react';
import type { AdCampaign } from '@shared/campaign';

interface Props {
  data: Partial<AdCampaign>;
}

export function PreviewTestimonial({ data }: Props) {
  return (
    <div className="mob-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {data.client_avatar ? (
            <img src={data.client_avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              {(data.client_name || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <div className="mob-title" style={{ fontSize: 13, marginBottom: 2 }}>
            {data.client_name || 'Müşteri Adı'}
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {Array.from({ length: Math.min(Math.floor(data.client_rating || 5), 5) }).map((_, i) => (
              <span key={i} className="material-icons" style={{ fontSize: 11, color: '#ffc107' }}>star</span>
            ))}
          </div>
        </div>
      </div>
      <p className="mob-sub" style={{ fontStyle: 'italic', marginBottom: 0, lineHeight: 1.5 }}>
        &quot;{data.body || 'Mükemmel bir deneyimdi, her şey için teşekkürler!'}&quot;
      </p>
    </div>
  );
}
