[![Deploy to GitHub Pages](https://github.com/davidpastorvicente/hitster-game/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/davidpastorvicente/hitster-game/actions/workflows/deploy.yml)

# Hitster Game

A music guessing game where teams build timelines by placing songs in chronological order.

![Hitster Logo](screenshot.png)

## 🎮 How to Play

1. **Setup Teams**: Choose 2-6 teams and set a winning score (5, 10, 15, or 20 songs)
2. **Listen**: Each turn, a team hears a mystery song
3. **Guess**: Place the song in your timeline (before, between, or after existing songs)
4. **Build**: Correct placements add the song to your timeline
5. **Win**: First team to reach the target number of songs wins!

## 🎵 Song Library

The game includes **291 curated songs** (125 English, 166 Spanish/Latin):

**English Songs:**
- 1960s-1990s: Classic hits from The Beatles, Queen, Michael Jackson, Nirvana
- 2000s-2020s: Modern anthems from Beyoncé, Ed Sheeran, The Weeknd, Billie Eilish

**Spanish/Latin Songs:**
- Heavy emphasis on reggaeton and Latin pop
- Artists: Bad Bunny, Karol G, Ozuna, Rauw Alejandro, Maluma, ROSALÍA, Shakira
- Spanish pop/rock: La Oreja de Van Gogh, Amaral, El Canto del Loco, Mecano, Héroes del Silencio
- Focus on post-2000 music with 70+ songs from 2020s alone

## 🎧 Audio Playback

- **Deezer API**: 290 songs (99%) play ad-free 30-second previews via Deezer
- **YouTube Fallback**: 1 song uses YouTube embed (may show ads)
- Preview URLs are fetched dynamically for freshness

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
- **Vite** - Build tool
- **Deezer API** - Ad-free audio previews (30 seconds)
- **YouTube Embeds** - Fallback audio playback
- **CSS3** - Styling with modern gradients

## 📝 Features

- ✅ Turn-based gameplay for multiple teams
- ✅ Configurable winning conditions
- ✅ Hidden song playback (no spoilers!)
- ✅ Play/Pause controls
- ✅ Visual timeline display
- ✅ Immediate feedback on correct/incorrect placements
- ✅ Winner announcement with full timeline
- ✅ Modern dark theme UI

## 🎨 Customization

### Adding New Songs

To add songs, simply edit `src/data/songs.js` and add entries **without any IDs**. You can place them anywhere in the file!

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
