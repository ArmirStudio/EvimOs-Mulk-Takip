import React from 'react';
import type { AdCampaign } from '@shared/campaign';

interface Props {
  data: Partial<AdCampaign>;
}

// Telefon viewport iç boyutları (phone-frame 320px, border 2×12px = 296px; padding sanal 0)
const PHONE_H = 578;
const PHONE_W = 296;

export function PreviewInterstitial({ data }: Props) {
  const widthPct  = data.modal_width_pct  ?? 85;
  const heightPct = data.image_height_pct ?? 35;
  const lockSec   = data.lock_duration    ?? 0;

  const modalW  = Math.round(PHONE_W * (widthPct / 100));
  const imageH  = Math.round(PHONE_H * (heightPct / 100));

  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '16px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        width: modalW,
        maxWidth: '100%',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}>
        {/* Close / Lock button */}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 10,
          width: 28, height: 28, borderRadius: '50%',
          background: lockSec > 0 ? 'var(--primary)' : '#f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}>
          {lockSec > 0 ? (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{lockSec}s</span>
          ) : (
            <span className="material-icons" style={{ fontSize: 16, color: '#555' }}>close</span>
          )}
        </div>

        {/* Görsel */}
        <div style={{ width: '100%', height: imageH, background: '#E9ECEF', overflow: 'hidden' }}>
          {data.image_url ? (
            <img src={data.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span className="material-icons" style={{ fontSize: 32, color: '#adb5bd' }}>image</span>
              <span style={{ fontSize: 10, color: '#adb5bd' }}>Görsel eklenmedi</span>
            </div>
          )}
        </div>

        {/* İçerik */}
        <div style={{ padding: '14px 16px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1C1E', marginBottom: 4, lineHeight: 1.3 }}>
            {data.title || 'Kampanya Başlığı'}
          </div>
          {data.body && (
            <div style={{ fontSize: 11, color: '#6C757D', marginBottom: 10, lineHeight: 1.4 }}>
              {data.body.length > 70 ? data.body.substring(0, 70) + '...' : data.body}
            </div>
          )}
          <div style={{
            background: 'var(--primary)', color: '#fff',
            borderRadius: 10, padding: '8px 12px',
            fontSize: 12, fontWeight: 700,
          }}>
            Detaylar
          </div>

          {/* Kilit bilgisi */}
          {lockSec > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 }}>
              <span className="material-icons" style={{ fontSize: 10, color: 'var(--primary)' }}>lock</span>
              <span style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 600 }}>
                {lockSec}sn sonra kapatılabilir
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
