import React from 'react';
import type { AdCampaign } from '@shared/campaign';
import { PreviewInlineAd } from './PreviewInlineAd';
import { PreviewNews } from './PreviewNews';
import { PreviewTestimonial } from './PreviewTestimonial';
import { PreviewService } from './PreviewService';
import { PreviewInterstitial } from './PreviewInterstitial';

interface Props {
  data: Partial<AdCampaign>;
}

export function PhonePreview({ data }: Props) {
  const renderPreview = () => {
    switch (data.type) {
      case 'inline_ad': return <PreviewInlineAd data={data} />;
      case 'news': return <PreviewNews data={data} />;
      case 'testimonial': return <PreviewTestimonial data={data} />;
      case 'service': return <PreviewService data={data} />;
      case 'interstitial': return <PreviewInterstitial data={data} />;
      default: return <div className="p-16 center muted">Önizleme hazırlanıyar...</div>;
    }
  };

  return (
    <div className="phone-preview-container">
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-viewport">
          <div className="phone-header">
            <span className="material-icons" style={{ fontSize: '18px' }}>menu</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>EstateFlow</span>
            <span className="material-icons" style={{ fontSize: '18px' }}>notifications_none</span>
          </div>
          
          <div className="phone-content">
            <div className="phone-mock-content mb-16" />
            
            {renderPreview()}

            <div className="phone-mock-content mt-16" style={{ height: '300px' }} />
          </div>

          <div className="phone-tabbar">
            {['home', 'search', 'add_box', 'favorite_border', 'person_outline'].map((icon, i) => (
              <span 
                key={icon} 
                className="material-icons" 
                style={{ fontSize: '22px', color: i === 0 ? 'var(--primary)' : '#999' }}
              >
                {icon}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="phone-preview-label">Canlı Mobil Önizleme</p>
    </div>
  );
}
