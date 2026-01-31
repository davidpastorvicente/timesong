import { translations } from '../translations';
import './Timeline.css';

// Array of color options for song cards
const CARD_COLORS = [
  { start: 'var(--primary)', end: 'var(--primary-dark)' },
  { start: 'var(--success)', end: 'var(--success-dark)' },
  { start: 'var(--danger)', end: 'var(--danger-dark)' },
  { start: 'var(--warning)', end: 'var(--warning-dark)' },
  { start: 'var(--purple)', end: 'var(--purple-dark)' },
  { start: 'var(--pink)', end: 'var(--pink-dark)' },
  { start: 'var(--orange)', end: 'var(--orange-dark)' },
  { start: 'var(--teal)', end: 'var(--teal-dark)' },
];

// Function to get a consistent random color based on song title
function getColorForSong(title) {
  // Use song title as seed for consistent color assignment
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CARD_COLORS.length;
  return CARD_COLORS[index];
}

export default function Timeline({ timeline = [], showYears, language }) {
  const t = translations[language];

  if (!timeline || timeline.length === 0) {
    return (
      <div className="timeline empty">
        <p>{t.noSongs}</p>
      </div>
    );
  }

  // Group songs by year
  const groupedByYear = [];
  let currentGroup = [timeline[0]];
  
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i].year === timeline[i - 1].year) {
      currentGroup.push(timeline[i]);
    } else {
      groupedByYear.push(currentGroup);
      currentGroup = [timeline[i]];
    }
  }
  groupedByYear.push(currentGroup);

  return (
    <div className="timeline">
      {groupedByYear.map((group, groupIndex) => (
        <div key={groupIndex} className="timeline-year-group">
          <div className="year-group-container">
            {group.map((song, songIndex) => {
              const colors = getColorForSong(song.title);
              return (
                <div 
                  key={songIndex} 
                  className="song-card"
                  style={{
                    background: `linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)`
                  }}
                >
                  <div className="song-info">
                    <div className="song-title">{song.title}</div>
                    <div className="song-artist">{song.artist}</div>
                    {showYears && <div className="song-year">{song.year}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {groupIndex < groupedByYear.length - 1 && (
            <div className="timeline-arrow">→</div>
          )}
        </div>
      ))}
    </div>
  );
}
