import React from 'react';
import type { AdCampaign } from '@shared/campaign';

interface Props {
  data: Partial<AdCampaign>;
}

export function PreviewService({ data }: Props) {
  return (
    <div className="mob-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'var(--primary-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span className="material-icons" style={{ fontSize: 24, color: 'var(--primary)' }}>
          {data.service_icon || 'room_service'}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <div className="mob-title" style={{ fontSize: 13, marginBottom: 2 }}>
          {data.title || 'Servis Başlığı'}
        </div>
        <div className="mob-sub" style={{ marginBottom: 0 }}>
          {data.company_name || 'Şirket Adı'}
        </div>
      </div>
      <span className="material-icons" style={{ fontSize: 18, color: '#adb5bd' }}>chevron_right</span>
    </div>
  );
}
