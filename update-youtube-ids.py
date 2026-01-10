#!/usr/bin/env python3
"""
Script to automatically fetch missing YouTube IDs for songs in songs.js
Uses ytmusicapi to search YouTube Music and update songs without youtubeId.

Usage:
    python3 update-youtube-ids.py
"""

from ytmusicapi import YTMusic
import re
import time

def extract_songs_from_file(filepath):
    """Extract all songs from the songs.js file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match songs with or without youtubeId
    pattern = r'\{\s*id:\s*(\d+),\s*title:\s*"([^"]+)",\s*artist:\s*"([^"]+)",\s*year:\s*(\d+)(?:,\s*youtubeId:\s*"([^"]*)")?\s*\}'
    
    songs = []
    for match in re.finditer(pattern, content):
        song = {
            'id': int(match.group(1)),
            'title': match.group(2),
            'artist': match.group(3),
            'year': int(match.group(4)),
            'youtubeId': match.group(5) if match.group(5) else None
        }
        songs.append(song)
    
    return songs, content

def fetch_youtube_id(ytmusic, title, artist):
    """Fetch YouTube ID from YouTube Music API."""
    try:
        search_query = f"{title} {artist}"
        search_results = ytmusic.search(search_query, filter="songs", limit=1)
        
        if search_results and len(search_results) > 0:
            video_id = search_results[0].get('videoId')
            return video_id
        return None
    except Exception as e:
        print(f"  ✗ Error fetching: {e}")
        return None

def update_songs_file(filepath, updates):
    """Update the songs.js file with new YouTube IDs."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for song_id, youtube_id in updates.items():
        # Pattern to find song by ID and add/update youtubeId
        # First try to update existing youtubeId
        pattern_with_id = rf'(\{{\s*id:\s*{song_id},\s*title:[^}}]+youtubeId:\s*")[^"]*(")' 
        new_content = re.sub(pattern_with_id, rf'\1{youtube_id}\2', content, flags=re.DOTALL)
        
        # If no change, song doesn't have youtubeId yet, add it
        if new_content == content:
            pattern_without_id = rf'(\{{\s*id:\s*{song_id},\s*title:\s*"[^"]+",\s*artist:\s*"[^"]+",\s*year:\s*\d+)(\s*\}})'
            new_content = re.sub(
                pattern_without_id, 
                rf'\1, youtubeId: "{youtube_id}"\2', 
                content, 
                flags=re.DOTALL
            )
        
        content = new_content
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    filepath = 'src/data/songs.js'
    
    print("=" * 60)
    print("YouTube ID Updater for Hitster Game")
    print("=" * 60)
    print()
    
    # Extract songs from file
    print("📖 Reading songs.js file...")
    songs, content = extract_songs_from_file(filepath)
    print(f"✓ Found {len(songs)} songs in file\n")
    
    # Find songs without YouTube IDs
    missing_songs = [s for s in songs if not s['youtubeId'] or s['youtubeId'].strip() == '']
    
    if not missing_songs:
        print("✅ All songs already have YouTube IDs!")
        print("Nothing to update.")
        return
    
    print(f"🔍 Found {len(missing_songs)} songs without YouTube IDs\n")
    
    # Initialize YouTube Music API
    print("🎵 Initializing YouTube Music API...")
    ytmusic = YTMusic()
    print("✓ API ready\n")
    
    # Fetch missing YouTube IDs
    updates = {}
    failed = []
    
    print("🔎 Fetching missing YouTube IDs...\n")
    for i, song in enumerate(missing_songs, 1):
        print(f"[{i}/{len(missing_songs)}] {song['title']} - {song['artist']}")
        
        youtube_id = fetch_youtube_id(ytmusic, song['title'], song['artist'])
        
        if youtube_id:
            updates[song['id']] = youtube_id
            print(f"  ✓ Found: {youtube_id}")
        else:
            failed.append(song)
            print(f"  ✗ Not found")
        
        # Small delay to avoid rate limiting
        if i < len(missing_songs):
            time.sleep(0.5)
    
    print()
    print("=" * 60)
    print(f"✓ Successfully fetched: {len(updates)}")
    print(f"✗ Failed: {len(failed)}")
    print("=" * 60)
    print()
    
    # Update the file
    if updates:
        print("💾 Updating songs.js file...")
        update_songs_file(filepath, updates)
        print(f"✓ Updated {len(updates)} songs in {filepath}")
    
    # Show failed songs
    if failed:
        print("\n⚠️  Failed to find YouTube IDs for:")
        for song in failed:
            print(f"  - ID {song['id']}: {song['title']} by {song['artist']}")
        print("\nYou may need to manually add these YouTube IDs.")
    
    print("\n✅ Done!")

if __name__ == "__main__":
    main()
