// Fix your upload function in RecordWhisper component:

async function upload() {
  if (!chunks.length) {
    setError('No recording to upload');
    return;
  }

  try {
    setError(null);
    setUploading(true);
    setUploadSuccess(false);

    const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
    
    // Create FormData
    const formData = new FormData();
    formData.append('audio', blob, 'whisper.webm');
    
    // Don't manually set Content-Type - the apiClient interceptor handles it for FormData
    const response = await apiClient.post(
      `/api/twilio/my-numbers/${phoneNumberId}/whisper/upload`,
      formData
      // No headers needed - interceptor handles FormData Content-Type
    );

    const data = response.data;
    
    // Check for success and get media URL from response
    if (data.success) {
      // The backend returns: { success: true, media_url: "...", whisper: {...} }
      const mediaUrl = data.media_url || data.whisper?.media_url;
      
      if (mediaUrl) {
        setUploadSuccess(true);
        setChunks([]);
        setSeconds(0);
        setIsPlaying(false);
        // Clean up audio URL
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        onUploadSuccess?.(mediaUrl);
        
        // Reset success message after 3 seconds
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        throw new Error('Upload succeeded but no media URL returned');
      }
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (err: any) {
    console.error('Upload error:', err);
    // Better error handling
    const errorMessage = 
      err?.response?.data?.error || 
      err?.response?.data?.details || 
      err?.message || 
      'Upload failed';
    
    setError(errorMessage);
    onError?.(errorMessage);
    
    // Log full error for debugging
    if (err?.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
  } finally {
    setUploading(false);
  }
}
