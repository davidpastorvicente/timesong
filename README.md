# Hitster Game

A music guessing game where teams build timelines by placing songs in chronological order.

## 🎮 How to Play

1. **Setup Teams**: Choose 2-6 teams and set a winning score (5, 10, 15, or 20 songs)
2. **Listen**: Each turn, a team hears a mystery song
3. **Guess**: Place the song in your timeline (before, between, or after existing songs)
4. **Build**: Correct placements add the song to your timeline
5. **Win**: First team to reach the target number of songs wins!

## 🎵 Song Library

The game includes **251 curated songs** (125 English, 126 Spanish/Latin):

**English Songs:**
- 1960s-1990s: Classic hits from The Beatles, Queen, Michael Jackson, Nirvana
- 2000s-2020s: Modern anthems from Beyoncé, Ed Sheeran, The Weeknd, Billie Eilish

**Spanish/Latin Songs:**
- Heavy emphasis on reggaeton and Latin pop
- Artists: Bad Bunny, Karol G, Ozuna, Rauw Alejandro, Maluma, ROSALÍA, Shakira
- Focus on post-2000 music with 66 songs from 2020s alone

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
- **YouTube Embeds** - Audio playback
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

To add songs, edit `src/data/songs.js` and add entries **without YouTube IDs**:

```javascript
{
  id: 252,
  title: "Your Song Title",
  artist: "Artist Name",
  year: 2024
}
```

Then run the automatic YouTube ID updater:

```bash
python3 update-youtube-ids.py
```

The script will automatically fetch the correct YouTube ID from YouTube Music and update the file. See `YOUTUBE_ID_UPDATER_README.md` for details.

### Manual YouTube ID Entry

You can also add songs with YouTube IDs directly:

```javascript
{
  id: 252,
  title: "Your Song Title",
  artist: "Artist Name",
  year: 2024,
  youtubeId: "youtube_video_id"
}
```

## 📦 Project Structure

```
src/
├── components/
│   ├── GameSetup.jsx       # Team configuration
│   ├── GameBoard.jsx       # Main game logic
│   ├── Timeline.jsx        # Timeline display
│   ├── SongPlayer.jsx      # Audio player
│   └── PlacementButtons.jsx # Placement controls
├── data/
│   └── songs.js            # Curated song library
└── App.jsx                 # Root component
```

## 🎯 No API Keys Required!

This version uses a curated song list - just clone and play!

---

Enjoy the game! 🎵
