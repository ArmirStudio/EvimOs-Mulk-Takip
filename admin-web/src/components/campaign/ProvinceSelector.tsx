import { TURKEY_PROVINCES } from '@shared/turkeyLocations';

interface Props {
  selectedProvinces: string[];
  onChange: (provinces: string[]) => void;
}

export default function ProvinceSelector({ selectedProvinces, onChange }: Props) {
  const toggleProvince = (name: string) => {
    if (selectedProvinces.includes(name)) {
      onChange(selectedProvinces.filter(p => p !== name));
    } else {
      onChange([...selectedProvinces, name]);
    }
  };

  const selectAll = () => onChange(TURKEY_PROVINCES);
  const selectNone = () => onChange([]);

  return (
    <div className="space-y-16">
      <div className="flex justify-between items-center mb-16">
        <label style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase' }}>Hedef İller (Toplam: 81)</label>
        <div className="flex gap-12">
          <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={selectAll}>Tümünü Seç</button>
          <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12, background: 'transparent', border: '1px solid var(--border)' }} onClick={selectNone}>Temizle</button>
        </div>
      </div>

      <div className="province-grid">
        {TURKEY_PROVINCES.map(name => {
          const isActive = selectedProvinces.includes(name);
          return (
            <div
              key={name}
              className={`province-item ${isActive ? 'active' : ''}`}
              onClick={() => toggleProvince(name)}
            >
              <span className="material-icons" style={{ fontSize: 14 }}>
                {isActive ? 'check_circle' : 'add_circle_outline'}
              </span>
              {name}
            </div>
          );
        })}
      </div>
      
      {selectedProvinces.length > 0 && (
        <div className="muted mt-12" style={{ fontWeight: 600, color: 'var(--primary)' }}>
          {selectedProvinces.length} il seçildi.
        </div>
      )}
    </div>
  );
}
