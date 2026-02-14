import SongPlayer from './SongPlayer';
import ImageHint from './ImageHint';

/**
 * MediaPlayer - Wrapper component that renders appropriate player based on media type
 * @param {string} category - Media category ('songs' or 'movies')
 * @param {object} media - Media item (song or movie object)
 * @param {function} onEnded - Callback when media playback/display ends
 * @param {string} language - Current language
 */
export default function MediaPlayer({ category, media, onEnded, language }) {
  if (!media) {
    return null;
  }

  // Render based on category
  if (category === 'songs') {
    return (
      <SongPlayer 
        song={media}
        onEnded={onEnded}
        language={language}
      />
    );
  }

  if (category === 'movies') {
    return (
      <ImageHint 
        backdropUrl={media.backdropUrl}
        title={media.title}
      />
    );
  }

  return null;
}
