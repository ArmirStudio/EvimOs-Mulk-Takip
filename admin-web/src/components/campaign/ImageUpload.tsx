import React, { useRef, useState } from 'react';
import { useImageUpload } from '../../hooks/useImageUpload';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  aspectHint?: string;
  circular?: boolean;
}

export function ImageUpload({ value, onChange, label, folder, aspectHint, circular }: Props) {
  const { uploadImage, uploading, error: uploadError } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState(value);
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const showSuccess = () => {
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, folder);
    if (url) {
      onChange(url);
      setUrlInput(url);
      showSuccess();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, folder);
    if (url) {
      onChange(url);
      setUrlInput(url);
      showSuccess();
    }
  };

  const handleUrlBlur = () => {
    if (urlInput !== value) {
      onChange(urlInput);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="form-group mb-16">
      {label && <label className="form-label">{label}</label>}
      {aspectHint && <span className="help-text">{aspectHint}</span>}

      <div className="mt-8">
        {value ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img 
              src={value} 
              alt="Preview" 
              style={{
                width: circular ? 100 : '100%',
                height: circular ? 100 : 'auto',
                maxHeight: 200,
                objectFit: 'cover',
                borderRadius: circular ? '50%' : '12px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
            />
            <button 
              onClick={handleRemove}
              className="center pointer"
              style={{
                position: 'absolute', top: -10, right: -10,
                width: 28, height: 28, borderRadius: '50%',
                background: '#E03131', color: '#FFF', border: '2px solid #FFF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <span className="material-icons" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>
        ) : (
          <div 
            className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="center flex-col gap-8">
                <div className="spinner" style={{ width: 24, height: 24, borderTopColor: 'var(--primary)' }} />
                <span className="muted">Yükleniyor...</span>
              </div>
            ) : (
              <div className="center flex-col gap-8 text-muted">
                <span className="material-icons" style={{ fontSize: 48, color: dragActive ? 'var(--primary)' : 'var(--border)' }}>cloud_upload</span>
                <div style={{ fontWeight: 600, color: dragActive ? 'var(--primary)' : 'inherit' }}>
                  Görseli Sürükleyin veya Tıklayın
                </div>
                <div style={{ fontSize: 12 }}>Sadece JPG, PNG veya GIF (Maks 5MB)</div>
              </div>
            )}
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/*"
        />

        <div className="mt-12 flex items-center gap-8">
          <span className="material-icons muted" style={{ fontSize: 18 }}>link</span>
          <input 
            type="text" 
            className="form-control"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="Veya görselin URL adresini buraya yapıştırın..."
            style={{ padding: '8px 12px', fontSize: '13px', flex: 1 }}
          />
        </div>

        {uploadSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#2e7d32', fontSize: 13, fontWeight: 600 }}>
            <span className="material-icons" style={{ fontSize: 18, color: '#2e7d32' }}>check_circle</span>
            Görsel başarıyla yüklendi
          </div>
        )}
        {uploadError && <p style={{ color: '#E03131', fontSize: 12, marginTop: 8 }}>{uploadError}</p>}
      </div>
    </div>
  );
}
