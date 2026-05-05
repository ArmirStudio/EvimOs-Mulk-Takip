import React from 'react';
import type { AdCampaign } from '@shared/campaign';
import ProvinceSelector from './ProvinceSelector';
import AgencySelector from './AgencySelector';

const ROLES = [
  { key: 'agent', label: 'Emlak Ofisleri' },
  { key: 'landlord', label: 'Ev Sahipleri' },
  { key: 'tenant', label: 'Kiracılar' },
  { key: 'employee', label: 'Kurumsal Firmalar' },
];

interface Props {
  data: Partial<AdCampaign>;
  onChange: (updates: Partial<AdCampaign>) => void;
}

export function CampaignTargeting({ data, onChange }: Props) {
  const toggleRole = (role: string) => {
    const prev = data.target_roles || [];
    if (prev.includes(role)) {
      onChange({ target_roles: prev.filter(r => r !== role) });
    } else {
      onChange({ target_roles: [...prev, role] });
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-8 mb-16">
        <span className="material-icons">gps_fixed</span>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Hedefleme Seçenekleri</h3>
      </div>

      <div className="form-group">
        <label>Hedef Roller <span className="muted">(en az bir adet seçilmelidir)</span></label>
        <div className="flex flex-wrap gap-8 mt-8">
          {ROLES.map(r => (
            <button 
              key={r.key} 
              className={`chip pointer ${data.target_roles?.includes(r.key) ? 'active' : ''}`}
              onClick={() => toggleRole(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ProvinceSelector 
        selectedProvinces={data.target_provinces || []} 
        onChange={(p: string[]) => onChange({ target_provinces: p })} 
      />

      <AgencySelector 
        selectedAgencyIds={data.target_agency_ids || []} 
        onChange={(ids: string[]) => onChange({ target_agency_ids: ids })} 
      />
    </div>
  );
}
