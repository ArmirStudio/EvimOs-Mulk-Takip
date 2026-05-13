import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  type AdCampaign,
  type AdCampaignStats,
  CAMPAIGN_TYPE_ICONS,
  CAMPAIGN_TYPE_LABELS,
} from '@shared/campaign';
import {
  deleteAdminCampaign,
  duplicateAdminCampaign,
  listAdminCampaigns,
  listAdminCampaignStats,
  toggleAdminCampaign,
} from '../lib/api';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [statsByCampaign, setStatsByCampaign] = useState<Record<string, AdCampaignStats>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    void fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const [response, statsResponse] = await Promise.all([
        listAdminCampaigns(),
        listAdminCampaignStats(),
      ]);
      setCampaigns(response.campaigns || []);
      setStatsByCampaign(
        Object.fromEntries((statsResponse.stats || []).map((item) => [item.campaign_id, item]))
      );
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await toggleAdminCampaign(id, !current);
      void fetchCampaigns();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Emin misiniz? Bu islem geri alinamaz.')) {
      return;
    }

    try {
      await deleteAdminCampaign(id);
      void fetchCampaigns();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const duplicateCampaign = async (campaign: AdCampaign) => {
    setDuplicating(campaign.id);

    try {
      const response = await duplicateAdminCampaign(campaign.id);
      nav(`/edit/${response.campaign.id}`);
    } catch (error: any) {
      console.error('Duplicate error:', error);
      alert(`Kopyalama basarisiz: ${error.message}`);
    } finally {
      setDuplicating(null);
    }
  };

  const filteredCampaigns =
    filter === 'all' ? campaigns : campaigns.filter((campaign) => campaign.type === filter);

  const isExpired = (campaign: AdCampaign): boolean => {
    if (!campaign.end_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(campaign.end_date);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getTargetSummary = (campaign: AdCampaign) => {
    const roles = campaign.target_roles?.length || 0;
    const provinces =
      campaign.target_provinces?.length === 81
        ? 'Tum Turkiye'
        : `${campaign.target_provinces?.length || 0} Il`;
    const agencies = campaign.target_agency_ids?.length || 0;

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 muted" style={{ fontSize: 11 }}>
          <span className="material-icons" style={{ fontSize: 12 }}>
            groups
          </span>
          {roles} Rol
        </div>
        <div className="flex items-center gap-4 muted" style={{ fontSize: 11 }}>
          <span className="material-icons" style={{ fontSize: 12 }}>
            place
          </span>
          {provinces}
        </div>
        {agencies > 0 && (
          <div className="flex items-center gap-4 muted" style={{ fontSize: 11 }}>
            <span className="material-icons" style={{ fontSize: 12 }}>
              business
            </span>
            {agencies} Ofis
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="main-content">
      <div className="sticky-header">
        <div className="sticky-header-row">
          <div>
            <h1>Kampanyalar</h1>
            <p className="muted">{campaigns.length} kampanya bulundu</p>
          </div>
          <button className="btn btn-primary" onClick={() => nav('/create')}>
            <span className="material-icons">add</span>
            Yeni Kampanya Olustur
          </button>
        </div>

        <div className="mt-24">
          <div className="filter-tabs">
            {['all', 'inline_ad', 'news', 'testimonial', 'service', 'interstitial'].map((type) => (
              <button
                key={type}
                className={`filter-tab${filter === type ? ' active' : ''}`}
                onClick={() => setFilter(type)}
              >
                {type === 'all' ? 'Tumu' : CAMPAIGN_TYPE_LABELS[type as keyof typeof CAMPAIGN_TYPE_LABELS]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="center" style={{ height: 200 }}>
          <div className="spinner" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="center" style={{ height: 200, flexDirection: 'column', gap: 12 }}>
          <span className="material-icons" style={{ fontSize: 48, color: 'var(--border)' }}>
            inbox
          </span>
          <p className="muted">Bu filtrede kampanya bulunamadi</p>
        </div>
      ) : (
        <table className="data-table">
          <colgroup>
            <col style={{ width: 140 }} />
            <col />
            <col style={{ width: 140 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 60 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 120 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Tur</th>
              <th>Kampanya Detayi</th>
              <th>Hedefleme</th>
              <th>Tarih Araligi</th>
              <th>Istatistik</th>
              <th>Sira</th>
              <th>Durum</th>
              <th>Islem</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.map((campaign) => {
              const stats = statsByCampaign[campaign.id];
              return (
              <tr key={campaign.id}>
                <td>
                  <div className="flex items-center gap-8">
                    <span className="material-icons text-primary" style={{ fontSize: 18 }}>
                      {CAMPAIGN_TYPE_ICONS[campaign.type] || 'campaign'}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>
                      {CAMPAIGN_TYPE_LABELS[campaign.type] || campaign.type}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                    {campaign.title || campaign.client_name || '-'}
                  </div>
                  {campaign.body && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {campaign.body.substring(0, 60)}
                      {campaign.body.length > 60 ? '...' : ''}
                    </div>
                  )}
                </td>
                <td>{getTargetSummary(campaign)}</td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(campaign.start_date)}</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {formatDate(campaign.end_date)}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-4">
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {stats?.impressions ?? 0} gosterim
                    </span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {stats?.clicks ?? 0} tik / {stats?.link_opens ?? 0} link
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{campaign.sort_order}</td>
                <td>
                  <div
                    className={`badge ${!isExpired(campaign) && campaign.active ? 'badge-success' : 'badge-error'}`}
                    onClick={() => !isExpired(campaign) && toggleStatus(campaign.id, campaign.active)}
                    style={{ cursor: isExpired(campaign) ? 'not-allowed' : 'pointer', userSelect: 'none', transition: 'opacity 0.15s', opacity: isExpired(campaign) ? 0.6 : 1 }}
                    title={isExpired(campaign) ? 'Süresi bitti (Pasif)' : campaign.active ? 'Pasife al' : 'Aktife al'}
                    onMouseEnter={(event) => {
                      if (!isExpired(campaign)) event.currentTarget.style.opacity = '0.75';
                    }}
                    onMouseLeave={(event) => {
                      if (!isExpired(campaign)) event.currentTarget.style.opacity = '1';
                    }}
                  >
                    {isExpired(campaign) ? 'Süresi Bitti' : campaign.active ? 'Aktif' : 'Pasif'}
                  </div>
                </td>
                <td>
                  <div className="flex gap-4">
                    <button
                      className="btn btn-secondary"
                      style={{ padding: 6 }}
                      onClick={() => nav(`/edit/${campaign.id}`)}
                      title="Duzenle"
                    >
                      <span className="material-icons" style={{ fontSize: 18 }}>
                        edit
                      </span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: 6 }}
                      onClick={() => duplicateCampaign(campaign)}
                      disabled={duplicating === campaign.id}
                      title="Kopyala"
                    >
                      <span className="material-icons" style={{ fontSize: 18 }}>
                        {duplicating === campaign.id ? 'hourglass_empty' : 'content_copy'}
                      </span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: 6, color: '#E53E3E' }}
                      onClick={() => deleteCampaign(campaign.id)}
                      title="Sil"
                    >
                      <span className="material-icons" style={{ fontSize: 18 }}>
                        delete
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
