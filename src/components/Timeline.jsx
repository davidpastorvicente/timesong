import { translations } from '../translations';
import './Timeline.css';

// Array of color options for timeline cards
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

// Seeded Fisher-Yates shuffle algorithm
function seededShuffle(array, seed) {
  const shuffled = [...array];
  let currentSeed = seed;
  
  // Simple LCG (Linear Congruential Generator) for deterministic randomness
  const random = () => {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
    return currentSeed / 4294967296;
  };
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Store color pools per player - keyed by playerId
const playerColorPools = new Map();

// Generate a unique color pool for each player
function getPlayerColorPool(playerId) {
  if (!playerColorPools.has(playerId)) {
    // Use playerId as seed for deterministic but unique shuffling
    const pool = [];
    let seed = playerId + 1; // Add 1 to avoid seed=0
    for (let i = 0; i < 100; i += CARD_COLORS.length) {
      pool.push(...seededShuffle(CARD_COLORS, seed));
      seed += 12345; // Change seed for next batch
    }
    playerColorPools.set(playerId, pool);
  }
  return playerColorPools.get(playerId);
}

// Store color assignments per player per item
const playerItemColors = new Map(); // Map<playerId, Map<itemKey, color>>

// Get or assign a color for a specific item in a player's timeline
function getColorForPlayerItem(playerId, item) {
  // Create unique identifier using title and year (works for both songs and movies)
  const itemKey = `${item.title}|${item.year}`;
  
  if (!playerItemColors.has(playerId)) {
    playerItemColors.set(playerId, new Map());
  }
  
  const playerColors = playerItemColors.get(playerId);
  
  if (!playerColors.has(itemKey)) {
    // Get player's color pool
    const colorPool = getPlayerColorPool(playerId);
    
    // Assign next available color (based on current number of items)
    const colorIndex = playerColors.size % colorPool.length;
    playerColors.set(itemKey, colorPool[colorIndex]);
  }
  
  return playerColors.get(itemKey);
}

export default function Timeline({ timeline = [], language, playerId = 0, category}) {
  const t = translations[language];

  if (!timeline || timeline.length === 0) {
    return (
      <div className="timeline empty">
        <p>{t.noItems}</p>
      </div>
    );
  }

  // Group items by year
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
            {group.map((item, itemIndex) => {
              const colors = getColorForPlayerItem(playerId, item);
              return (
                <div 
                  key={itemIndex} 
                  className="item-card"
                  style={{
                    background: `linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)`
                  }}
                >
                  <div className="item-info">
                    <div className="item-title">{item.title}</div>
                    {category === 'songs' && item.artist && (
                      <div className="item-subtitle">{item.artist}</div>
                    )}
                    {category === 'movies' && item.type && (
                      <div className="item-subtitle">
                        {item.type === 'movie' ? t.movie : t.tvShow}
                      </div>
                    )}
                    <div className="item-year">{item.year}</div>
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
