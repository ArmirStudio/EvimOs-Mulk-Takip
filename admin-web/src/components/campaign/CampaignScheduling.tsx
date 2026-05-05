import React from 'react';
import type { AdCampaign } from '@shared/campaign';

interface Props {
  data: Partial<AdCampaign>;
  onChange: (updates: Partial<AdCampaign>) => void;
}

export function CampaignScheduling({ data, onChange }: Props) {
  return (
    <div className="card" style={{ padding: '24px' }}>
      <div className="flex items-center gap-8 mb-24" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <span className="material-icons" style={{ color: 'var(--primary)' }}>event</span>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Yayın ve Zamanlama</h3>
      </div>

      <div className="form-group">
        <label className="form-label">
          Başlangıç Tarihi
        </label>
        <span className="help-text">Kampanya bu tarihten önce uygulamada gösterilmez.</span>
        <input 
          type="date" 
          className="form-control mt-4"
          value={data.start_date || ''} 
          onChange={(e) => onChange({ start_date: e.target.value })} 
        />
      </div>

      <div className="form-group mt-16">
        <label className="form-label">
          Bitiş Tarihi
        </label>
        <span className="help-text">Bu tarihten sonra kampanya otomatik olarak yayından kalkar. (Boş bırakırsanız süresiz yayınlanır)</span>
        <input 
          type="date" 
          className="form-control mt-4"
          value={data.end_date || ''} 
          onChange={(e) => onChange({ end_date: e.target.value })} 
        />
      </div>

      <div className="form-group mt-24">
        <label className="form-label">Görüntüleme Sırası (Öncelik)</label>
        <span className="help-text">Daha küçük sayılar daha üstte/önce görünür (Örn: 0 en üst).</span>
        <input 
          type="number" 
          className="form-control mt-4"
          value={data.sort_order ?? 0} 
          onChange={(e) => onChange({ sort_order: parseInt(e.target.value) || 0 })}
          min={0}
        />
      </div>

      <div className="mt-24 p-16" style={{ background: data.active ? 'var(--primary-light)' : '#F1F3F5', borderRadius: '12px', border: `1px solid ${data.active ? 'var(--primary)' : 'var(--border)'}`, transition: 'all 0.3s' }}>
        <label className="flex items-center justify-between pointer" style={{ margin: 0 }}>
          <div className="flex flex-col">
            <span style={{ fontSize: 14, fontWeight: 700, color: data.active ? 'var(--primary-dark)' : 'var(--text-muted)' }}>
              {data.active ? 'Kampanya Yayında (Aktif)' : 'Kampanya Durduruldu (Pasif)'}
            </span>
            <span style={{ fontSize: 12, color: data.active ? 'var(--primary)' : 'var(--text-muted)', marginTop: 4 }}>
              Kullanıcılar uygulamayı açtıklarında bu kampanyayı görebilirler.
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <input 
              type="checkbox" 
              checked={data.active ?? true} 
              onChange={() => onChange({ active: !data.active })} 
              style={{ width: 24, height: 24, cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
          </div>
        </label>
      </div>

    </div>
  );
}
