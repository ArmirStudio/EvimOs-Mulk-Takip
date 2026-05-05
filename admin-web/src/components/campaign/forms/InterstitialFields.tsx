import React from 'react';
import type { AdCampaign } from '@shared/campaign';
import { ImageUpload } from '../ImageUpload';
import { AdvertiserFields } from '../AdvertiserFields';

interface Props {
  data: Partial<AdCampaign>;
  onChange: (updates: Partial<AdCampaign>) => void;
}

// Telefon viewport referans boyutları (önizleme hesabı için)
const PHONE_H = 578;
const PHONE_W = 276;

// Saat seçeneklerini oluştur: "00:00" → "23:00"
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

export function InterstitialFields({ data, onChange }: Props) {
  const widthPct  = data.modal_width_pct  ?? 85;
  const heightPct = data.image_height_pct ?? 35;
  const lockSec   = data.lock_duration    ?? 0;
  const startHour = data.start_hour       ?? 7;

  const previewModalPx = Math.round(PHONE_W * (widthPct / 100));
  const previewImgPx   = Math.round(PHONE_H * (heightPct / 100));

  return (
    <div className="space-y-16">

      {/* ── İçerik ── */}
      <div className="card" style={{ padding: '24px' }}>
        <div className="flex items-center gap-8 mb-24" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <span className="material-icons" style={{ color: 'var(--primary)' }}>fullscreen</span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Tam Ekran Reklam İçeriği</h3>
            <p className="help-text">Kullanıcı ana ekranı açtığında üste belirir. Görsel kalitesi yüksek olmalıdır.</p>
          </div>
        </div>

        <ImageUpload
          label="Reklam Görseli"
          value={data.image_url || ''}
          onChange={(url) => onChange({ image_url: url })}
          aspectHint="Önerilen: 1080×1920 px (9:16). Görsel, modalın üst bölümünü kaplar."
          folder="ads/interstitial"
        />

        <div className="form-group mt-24">
          <label className="form-label">Başlık <span className="required">*</span></label>
          <span className="help-text">Görselin altında kalın harflerle görünen kısa başlık.</span>
          <input
            type="text"
            className="form-control mt-4"
            value={data.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Örn: Yeni Sezon Fırsatları!"
          />
        </div>

        <div className="form-group mt-16">
          <label className="form-label">Açıklama Metni</label>
          <span className="help-text">Başlığın altındaki açıklayıcı metin (isteğe bağlı).</span>
          <textarea
            className="form-control mt-4"
            value={data.body || ''}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Kampanya detayları..."
            style={{ minHeight: 80 }}
          />
        </div>

        <div className="form-group mt-16">
          <label className="form-label">Tıklama Linki (CTA URL) <span className="required">*</span></label>
          <span className="help-text">"Detaylar" butonuna basıldığında açılacak web adresi.</span>
          <input
            type="url"
            className="form-control mt-4"
            value={data.link_url || ''}
            onChange={(e) => onChange({ link_url: e.target.value })}
            placeholder="https://kampanya.sirketiniz.com"
          />
        </div>
      </div>

      {/* ── Modal Boyutları ── */}
      <div className="card" style={{ padding: '24px' }}>
        <div className="flex items-center gap-8 mb-20" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <span className="material-icons" style={{ color: 'var(--primary)' }}>aspect_ratio</span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Modal Boyutları</h3>
            <p className="help-text">Reklamın telefon ekranında kapladığı alan — sağdaki önizlemede canlı yansır.</p>
          </div>
        </div>

        {/* Genişlik */}
        <div className="form-group">
          <label className="form-label">
            Modal Genişliği
            <span style={{ marginLeft: 8, fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
              %{widthPct}
            </span>
            <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
              (≈ {previewModalPx} px)
            </span>
          </label>
          <span className="help-text">Ekran genişliğinin yüzdesi. %85 çoğu reklam için idealdir.</span>
          <input
            type="range" min={60} max={95} step={5}
            value={widthPct}
            onChange={(e) => onChange({ modal_width_pct: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--primary)', marginTop: 8, cursor: 'pointer' }}
          />
          <div className="flex justify-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>%60 Dar</span><span>%75</span><span>%85 ★</span><span>%95 Geniş</span>
          </div>
        </div>

        {/* Görsel Yüksekliği */}
        <div className="form-group mt-20">
          <label className="form-label">
            Görsel Yüksekliği
            <span style={{ marginLeft: 8, fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
              %{heightPct}
            </span>
            <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
              (≈ {previewImgPx} px)
            </span>
          </label>
          <span className="help-text">Görsel alanının ekran yüksekliğine oranı. Yüksek değer görseli büyütür, metin alanını küçültür.</span>
          <input
            type="range" min={20} max={50} step={5}
            value={heightPct}
            onChange={(e) => onChange({ image_height_pct: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--primary)', marginTop: 8, cursor: 'pointer' }}
          />
          <div className="flex justify-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>%20 Küçük</span><span>%30</span><span>%35 ★</span><span>%50 Büyük</span>
          </div>
        </div>
      </div>

      {/* ── Kapatma & Frekans ── */}
      <div className="card" style={{ padding: '24px' }}>
        <div className="flex items-center gap-8 mb-20" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <span className="material-icons" style={{ color: 'var(--primary)' }}>timer</span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Kapatma & Frekans</h3>
            <p className="help-text">Zorunlu izleme süresi ve günlük gösterim sınırı.</p>
          </div>
        </div>

        {/* Kapatma Kilidi */}
        <div className="form-group">
          <label className="form-label">
            Zorunlu İzleme Süresi
            <span style={{
              marginLeft: 8, fontWeight: 700, fontSize: 14,
              color: lockSec > 0 ? 'var(--primary)' : 'var(--text-muted)',
            }}>
              {lockSec === 0 ? '— Anında kapatılabilir' : `${lockSec} saniye kilitleniyor`}
            </span>
          </label>
          <span className="help-text">
            Bu süre boyunca X butonu gizlenir; sayaç bittikten sonra kullanıcı reklamı kapatabilir.
            <strong> 0 = reklam açılır açılmaz kapatılabilir.</strong>
          </span>
          <div className="flex items-center gap-12 mt-8">
            <input
              type="range" min={0} max={15} step={1}
              value={lockSec}
              onChange={(e) => onChange({ lock_duration: parseInt(e.target.value) })}
              style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            {/* Canlı gösterge */}
            <div style={{
              minWidth: 52, height: 40, borderRadius: 10, flexShrink: 0,
              background: lockSec > 0 ? 'var(--primary-light)' : '#F1F3F5',
              border: `2px solid ${lockSec > 0 ? 'var(--primary)' : '#DEE2E6'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 15, transition: 'all 0.2s',
              color: lockSec > 0 ? 'var(--primary-dark)' : '#ADB5BD',
            }}>
              {lockSec === 0
                ? <span className="material-icons" style={{ fontSize: 20 }}>close</span>
                : `${lockSec}s`
              }
            </div>
          </div>
          <div className="flex justify-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>0 (Anında)</span><span>3s</span><span>8s</span><span>15s</span>
          </div>
        </div>

        {/* Günlük Limit */}
        <div className="form-group mt-20">
          <label className="form-label">Günlük Gösterim Limiti (Kullanıcı Başına)</label>
          <span className="help-text">
            Aynı kullanıcıya bir günde en fazla kaç kez gösterilsin.
            <strong> Gösterimler arası minimum 2 saat aralık otomatik uygulanır.</strong>
          </span>
          <div className="flex items-center gap-8 mt-4">
            <input
              type="number"
              className="form-control"
              value={data.daily_frequency ?? 1}
              onChange={(e) => onChange({ daily_frequency: parseInt(e.target.value) || 0 })}
              min={0} max={10}
              style={{ width: '120px' }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>kez / gün</span>
          </div>
        </div>

        {/* Yayın Başlangıç Saati */}
        <div className="form-group mt-20" style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <label className="form-label">
            Günlük İlk Gösterim Saati
            <span style={{ marginLeft: 8, fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
              {String(startHour).padStart(2, '0')}:00
            </span>
          </label>
          <span className="help-text">
            Kullanıcıya bu saatten önce hiç gösterilmez.
            <strong> Varsayılan 07:00 — gece yarısı girilen reklamlar sabaha kadar bekler.</strong>
          </span>
          <div className="flex flex-wrap gap-8 mt-8">
            {[7, 8, 9, 10, 12, 14, 16, 18, 20].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onChange({ start_hour: h })}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: `2px solid ${startHour === h ? 'var(--primary)' : 'var(--border)'}`,
                  background: startHour === h ? 'var(--primary-light)' : 'var(--bg)',
                  color: startHour === h ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: startHour === h ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {String(h).padStart(2, '0')}:00
              </button>
            ))}
            {/* Özel saat */}
            <select
              value={[7,8,9,10,12,14,16,18,20].includes(startHour) ? '' : startHour}
              onChange={(e) => e.target.value && onChange({ start_hour: parseInt(e.target.value) })}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: `2px solid ${![7,8,9,10,12,14,16,18,20].includes(startHour) ? 'var(--primary)' : 'var(--border)'}`,
                background: 'var(--bg)',
                color: 'var(--text-muted)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <option value="">Özel saat...</option>
              {HOUR_OPTIONS.filter(o => ![7,8,9,10,12,14,16,18,20].includes(o.value)).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <AdvertiserFields data={data} onChange={onChange} />
    </div>
  );
}
