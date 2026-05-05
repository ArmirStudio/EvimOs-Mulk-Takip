import { CAMPAIGN_TYPE_OPTIONS, type CampaignType } from '@shared/campaign';

interface Props {
  selected: CampaignType;
  onChange: (type: CampaignType) => void;
  disabled?: boolean;
}

export default function CampaignTypeSelector({ selected, onChange, disabled = false }: Props) {
  return (
    <div className="space-y-16">
      <div
        className="muted"
        style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}
      >
        KAMPANYA TURU SECIN
      </div>
      <div className="flex flex-col gap-12">
        {CAMPAIGN_TYPE_OPTIONS.map((option) => {
          const isActive = selected === option.type;

          return (
            <div
              key={option.type}
              className={`type-option ${isActive ? 'active' : ''}`}
              onClick={() => !disabled && onChange(option.type)}
              style={{
                opacity: disabled && !isActive ? 0.65 : 1,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              <div
                className="center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: isActive ? '#fff' : 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >
                <span className="material-icons" style={{ fontSize: 24 }}>
                  {option.icon}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div className="type-label">{option.label}</div>
                <div className="type-desc">{option.desc}</div>
              </div>
              {isActive && (
                <div className="type-check">
                  <span className="material-icons" style={{ fontSize: 14 }}>
                    check
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
