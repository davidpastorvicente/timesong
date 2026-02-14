import { useState } from 'react';
import './ImageHint.css';

export default function ImageHint({ backdropUrl, title }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="image-hint">
      {!imageLoaded && !imageError && (
        <div className="image-loading">
          <div className="spinner"></div>
        </div>
      )}
      
      {imageError && (
        <div className="image-error">
          <p>⚠️ Image could not be loaded</p>
        </div>
      )}
      
      <img 
        src={backdropUrl}
        alt={`Scene from ${title}`}
        className={`backdrop-image ${imageLoaded ? 'loaded' : ''}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </div>
  );
}
