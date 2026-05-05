import { useState } from 'react';

import { uploadAdminPublicFile } from '../lib/api';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File, folder = 'campaigns'): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      const response = await uploadAdminPublicFile({
        bucket: 'ad-media',
        file,
        folder,
      });
      return response.public_url;
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Yukleme basarisiz oldu.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading, error };
}
