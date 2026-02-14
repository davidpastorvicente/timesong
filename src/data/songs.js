import { englishSongs } from './songs/english.js';
import { spanishSongs } from './songs/spanish.js';

// Combine all songs
const allSongs = [...englishSongs, ...spanishSongs];

// Define song sets for filtering
export const songSets = {
  everything: {
    name: 'Everything',
    songs: allSongs
  },
  english: {
    name: 'English',
    songs: englishSongs
  },
  spanish: {
    name: 'Spanish',
    songs: spanishSongs
  },
  new: {
    name: 'New Songs (2010+)',
    songs: allSongs.filter(song => song.year >= 2010)
  }
};
