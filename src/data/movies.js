import { englishMovies } from './movies/english.js';
import { spanishMovies } from './movies/spanish.js';

// Combine all movies
const allMovies = [...englishMovies, ...spanishMovies];

// Define movie sets for filtering
export const movieSets = {
  everything: {
    name: 'Everything',
    movies: allMovies
  },
  english: {
    name: 'English',
    movies: englishMovies
  },
  spanish: {
    name: 'Spanish',
    movies: spanishMovies
  },
  new: {
    name: 'New Movies (2010+)',
    movies: allMovies.filter(movie => movie.year >= 2010)
  }
};
