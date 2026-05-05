import { useEffect, useState } from 'react';

import { listAdminAgencyOptions } from '../../lib/api';

interface Agency {
  id: string;
  name: string;
  location: string;
  status: string;
}

interface Props {
  selectedAgencyIds: string[];
  onChange: (ids: string[]) => void;
}

export default function AgencySelector({ selectedAgencyIds, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Agency[]>([]);
  const [activeAgencies, setActiveAgencies] = useState<Agency[]>([]);
  const [allAgencies, setAllAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const response = await listAdminAgencyOptions();
        const agencies = response.agencies || [];
        setAllAgencies(agencies);
        setActiveAgencies(agencies.filter((agency) => agency.status === 'active').slice(0, 10));
      } catch (error) {
        console.error('Agency options error:', error);
      }
    };

    void fetchAgencies();
  }, []);

  const searchAgencies = (term: string) => {
    setSearch(term);

    if (term.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const normalizedTerm = term.trim().toLocaleLowerCase('tr-TR');
    setResults(
      allAgencies
        .filter((agency) =>
          `${agency.name} ${agency.location}`.toLocaleLowerCase('tr-TR').includes(normalizedTerm)
        )
        .slice(0, 10)
    );
    setLoading(false);
  };

  const toggleAgency = (id: string) => {
    if (selectedAgencyIds.includes(id)) {
      onChange(selectedAgencyIds.filter((agencyId) => agencyId !== id));
      return;
    }

    onChange([...selectedAgencyIds, id]);
  };

  return (
    <div className="space-y-16">
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase' }}>
          Emlak Sirketi / Ofis Hedefleme
        </label>
        <div style={{ position: 'relative', marginTop: 12 }}>
          <input
            type="text"
            placeholder="Ofis adi ile ara..."
            value={search}
            onChange={(event) => searchAgencies(event.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid var(--border)',
              outline: 'none',
              transition: 'all 0.2s',
              fontSize: '14px',
            }}
          />
          {loading && (
            <div className="spinner" style={{ position: 'absolute', right: 12, top: 12, width: 16, height: 16 }} />
          )}
        </div>
      </div>

      {results.length > 0 || search.length >= 2 ? (
        <div
          className="card"
          style={{ padding: 0, maxHeight: 200, overflowY: 'auto', border: '2px solid var(--primary-light)' }}
        >
          {results.map((agency) => (
            <div
              key={agency.id}
              className="suggestion-item pointer"
              onClick={() => toggleAgency(agency.id)}
              style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div style={{ fontWeight: 600 }}>{agency.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {agency.location}
                  </div>
                </div>
                {selectedAgencyIds.includes(agency.id) ? (
                  <span className="material-icons" style={{ color: 'var(--primary)' }}>
                    check_circle
                  </span>
                ) : (
                  <span className="material-icons" style={{ color: 'var(--border)' }}>
                    add_circle_outline
                  </span>
                )}
              </div>
            </div>
          ))}
          {results.length === 0 && !loading && <div className="p-16 muted center">Sonuc bulunamadi.</div>}
        </div>
      ) : (
        activeAgencies.length > 0 && (
          <div className="mt-24">
            <div className="muted mb-16" style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
              Onerilen Aktif Ofisler
            </div>
            <div className="flex flex-wrap gap-8">
              {activeAgencies.map((agency) => {
                const selected = selectedAgencyIds.includes(agency.id);

                return (
                  <button
                    key={agency.id}
                    className={`chip ${selected ? 'active' : ''}`}
                    onClick={() => toggleAgency(agency.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span className="material-icons" style={{ fontSize: 14 }}>
                      {selected ? 'check' : 'add'}
                    </span>
                    {agency.name} ({agency.location})
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {selectedAgencyIds.length > 0 && (
        <div className="mt-24">
          <div className="muted mb-16" style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
            Secili Ofisler ({selectedAgencyIds.length})
          </div>
          <div className="flex flex-wrap gap-8">
            {selectedAgencyIds.map((id) => {
              const agency =
                results.find((item) => item.id === id) ||
                activeAgencies.find((item) => item.id === id) ||
                allAgencies.find((item) => item.id === id);

              return (
                <div key={id} className="chip active" style={{ borderRadius: '8px' }}>
                  {agency?.name || 'Yukleniyor...'}
                  <span
                    className="material-icons"
                    style={{ fontSize: 16, cursor: 'pointer', marginLeft: 4 }}
                    onClick={() => toggleAgency(id)}
                  >
                    close
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
