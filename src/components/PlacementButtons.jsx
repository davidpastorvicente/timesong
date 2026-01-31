import { translations } from '../translations';
import './PlacementButtons.css';

export default function PlacementButtons({ timeline = [], onPlacement, language, disabled = false }) {
  const t = translations[language];

  if (!timeline || timeline.length === 0) {
    return (
      <div className="placement-buttons">
        <button 
          className="placement-button first"
          onClick={() => onPlacement(0)}
          disabled={disabled}
        >
          {t.placeAsFirst}
        </button>
      </div>
    );
  }

  const positions = [];
  
  positions.push({
    label: `${t.before} ${timeline[0].year}`,
    position: 0,
    type: 'before'
  });

  for (let i = 0; i < timeline.length - 1; i++) {
    // Only show "Between" button if years are different
    if (timeline[i].year !== timeline[i + 1].year) {
      positions.push({
        label: `${t.between} ${timeline[i].year} - ${timeline[i + 1].year}`,
        position: i + 1,
        type: 'between'
      });
    }
  }

  positions.push({
    label: `${t.after} ${timeline[timeline.length - 1].year}`,
    position: timeline.length,
    type: 'after'
  });

  return (
    <div className="placement-buttons">
      <p className="placement-instruction">{t.placementInstruction}</p>
      <div className="button-grid">
        {positions.map((pos, index) => (
          <button
            key={index}
            className={`placement-button ${pos.type}`}
            onClick={() => onPlacement(pos.position)}
            disabled={disabled}
          >
            {pos.label}
          </button>
        ))}
      </div>
    </div>
  );
}
