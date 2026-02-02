/**
 * Fetch fresh Deezer preview URL and album cover for a song.
 * Preview URLs expire after ~24h, so we fetch them at runtime.
 * Album covers are permanent and can be used from cached data.
 * 
 * @param {Object} song - Song object with deezerId and optional albumCover
 * @returns {Object} Object with previewUrl and albumCover
 */
export async function fetchDeezerPreview(song) {
  let previewUrl = null;
  let albumCover = song.albumCover || null; // Album covers are permanent
  
  if (song.deezerId) {
    const corsProxies = [
      'https://corsproxy.io/?',
      'https://cors.eu.org/'
    ];
    
    // Try each CORS proxy with 5 second timeout
    for (const proxy of corsProxies) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const url = `${proxy}https://api.deezer.com/track/${song.deezerId}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (data.preview) {
          previewUrl = data.preview;
          if (!albumCover && data.album?.cover_medium) {
            albumCover = data.album.cover_medium;
          }
          console.log(`✓ Deezer preview fetched via ${proxy}`);
          break; // Success, exit loop
        }
      } catch (error) {
        console.warn(`CORS proxy ${proxy} failed or timed out:`, error.message);
        // Continue to next proxy
      }
    }
    
    if (!previewUrl) {
      console.warn('All CORS proxies failed, falling back to YouTube');
    }
  }
  
  // Fallback to YouTube if no Deezer preview
  if (!previewUrl) {
    previewUrl = `https://www.youtube.com/embed/${song.youtubeId}?autoplay=1&controls=0`;
  }

  return { previewUrl, albumCover };
}
