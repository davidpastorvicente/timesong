[![Deploy to GitHub Pages](https://github.com/davidpastorvicente/timesong/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/davidpastorvicente/timesong/actions/workflows/deploy.yml)

# TimeSong Game

A music guessing game where teams build timelines by placing songs in chronological order.

![TimeSong Logo](screenshot.png)

## 🎮 How to Play

1. **Setup Teams**: Choose 2-6 teams and set a winning score (5, 10, 15, or 20 songs)
2. **Listen**: Each turn, a team hears a mystery song
3. **Guess**: Place the song in your timeline (before, between, or after existing songs)
4. **Build**: Correct placements add the song to your timeline
5. **Win**: First team to reach the target number of songs wins!

## 🎵 Song Library

The game includes **368 curated songs** (205 English, 163 Spanish/Latin):

**English Songs:**
- 1960s-1990s: Classic hits from The Beatles, Queen, Michael Jackson, Nirvana
- 2000s-2020s: Modern anthems from Beyoncé, Ed Sheeran, The Weeknd, Billie Eilish  
- 2010s party hits: Rihanna, Lady Gaga, Calvin Harris, Ariana Grande, Justin Bieber

**Spanish/Latin Songs:**
- Heavy emphasis on reggaeton and Latin pop
- Artists: Bad Bunny, Karol G, Ozuna, Rauw Alejandro, Maluma, ROSALÍA, Shakira
- Spanish pop/rock: La Oreja de Van Gogh, Amaral, El Canto del Loco, Mecano, Héroes del Silencio
- Focus on post-2000 music with 70+ songs from 2020s alone

## 🎧 Audio Playback

- **Deezer API**: 367 songs (~99%) play ad-free 30-second previews via Deezer
- **YouTube Fallback**: 1 song uses YouTube embed (may show ads)
- Preview URLs are fetched dynamically at runtime for freshness
- CORS proxy fallback chain ensures reliability

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

## 🛠 Tech Stack

- **React** - UI framework
- **Vite** - Build tool & dev server
- **Firebase Realtime Database** - Multi-device sync
- **Deezer API** - Ad-free audio previews (30 seconds)
- **YouTube Embeds** - Fallback audio playback
- **CSS3** - Modern styling with theme system

## 📝 Features

- ✅ Turn-based gameplay for multiple teams
- ✅ **Single-device mode** (hot-seat multiplayer)
- ✅ **Multi-device mode** (real-time sync via Firebase)
- ✅ Configurable winning conditions
- ✅ Hidden song playback (no spoilers!)
- ✅ Play/Pause controls
- ✅ Visual timeline display
- ✅ Immediate feedback on correct/incorrect placements
- ✅ Winner announcement with full timeline
- ✅ Modern dark/light theme UI
- ✅ Bilingual support (English/Spanish)

## 🎨 Customization

### Checking for Duplicates

Check for duplicate songs in the database:

```bash
python3 scripts/check-duplicates.py
```

This will scan both English and Spanish song databases for:
- 🔴 Duplicate Deezer IDs
- 🔴 Duplicate YouTube IDs  
- 🔴 Duplicate titles (case-insensitive)

**When duplicates are found**, the script automatically:
1. Re-fetches the correct YouTube ID for each song (using `ytmusic.search()`)
2. Re-fetches the correct Deezer ID for each song (using Deezer search API)
3. Shows you the new correct IDs

**To automatically fix the files:**
```bash
python3 scripts/check-duplicates.py --fix
```

This will update the data files with the correct IDs.

### Adding Songs from YouTube Playlists

Use the automated script to add entire playlists:

```bash
python3 scripts/add-playlist.py PLAYLIST_ID

# Or with full URL:
python3 scripts/add-playlist.py "https://music.youtube.com/playlist?list=..."

# For Spanish songs:
python3 scripts/add-playlist.py PLAYLIST_ID --language es

# For large playlists, limit to first N successful imports:
python3 scripts/add-playlist.py PLAYLIST_ID --limit 50
```

The script will:
- ✅ Fetch all tracks from the playlist (titles and artists)
- ✅ Optionally process until N songs are successfully imported
- ✅ Search for official YouTube video IDs (ensures best/canonical versions)
- ✅ Get YouTube IDs, Deezer IDs, album covers, and years
- ✅ Remove duplicates automatically
- ✅ Append formatted songs to the correct data file

**Note:** When using `--limit 50`, the script keeps processing songs until 50 are successfully imported (skipping any that fail).

### Adding Individual Songs

To add songs manually, edit `src/data/songs.js` and add entries **without any IDs**:

```javascript
{
  title: "Your Song Title",
  artist: "Artist Name",
  year: 2024
}
```

Then run the automatic ID updater:

```bash
python3 update-ids.py
```

The script will automatically:
- ✅ Fetch YouTube IDs from YouTube Music API
- ✅ Fetch Deezer IDs from Deezer API (for ad-free playback)
- ✅ Update the songs.js file with both IDs

### Manual ID Entry

You can also add songs with IDs directly:

```javascript
{
  title: "Your Song Title",
  artist: "Artist Name",
  year: 2024,
  youtubeId: "youtube_video_id",
  deezerId: "deezer_track_id"
}
```

## 📦 Project Structure

```
src/
├── components/
│   ├── GameSetup.jsx         # Team configuration
│   ├── GameBoard.jsx         # Main game logic
│   ├── Timeline.jsx          # Timeline display
│   ├── SongPlayer.jsx        # Audio player
│   └── PlacementButtons.jsx  # Placement controls
├── data/
│   └── songs.js              # Curated song library
└── App.jsx                   # Root component
```

## 🎯 No API Keys Required!

This version uses a curated song list - just clone and play!

---

Enjoy the game! 🎵
