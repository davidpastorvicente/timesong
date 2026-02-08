#!/usr/bin/env python3
"""
Check for duplicate songs in TimeSong database

Checks for:
- Duplicate Deezer IDs (same deezerId in multiple songs)
- Duplicate YouTube IDs (same youtubeId in multiple songs)
- Duplicate titles (case-insensitive)

When duplicates are found, automatically re-fetches correct IDs for each song.

Usage:
    python3 scripts/check-duplicates.py
    python3 scripts/check-duplicates.py --fix  # Auto-update files with correct IDs
"""

import re
import sys
import time
from collections import defaultdict

import requests
from ytmusicapi import YTMusic


def load_songs_from_file(filename):
    """Load all songs from a data file"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract all song objects using regex
        # Match pattern: { title: "...", artist: "...", year: ..., youtubeId: "...", deezerId: "..." }
        song_pattern = r'\{\s*title:\s*"([^"]+)",\s*artist:\s*"([^"]+)",\s*year:\s*(\d+),\s*youtubeId:\s*"([^"]+)",\s*deezerId:\s*"([^"]+)"'
        
        matches = re.findall(song_pattern, content)
        
        songs = []
        for match in matches:
            title, artist, year, youtube_id, deezer_id = match
            songs.append({
                'title': title,
                'artist': artist,
                'year': year,
                'youtubeId': youtube_id,
                'deezerId': deezer_id,
                'file': filename
            })
        
        return songs
        
    except FileNotFoundError:
        print(f"❌ File not found: {filename}")
        return []


def fetch_youtube_id(ytmusic, title, artist):
    """Fetch YouTube ID by searching YouTube Music"""
    try:
        search_query = f"{title} {artist}"
        search_results = ytmusic.search(search_query, filter="songs", limit=1)
        
        if search_results and len(search_results) > 0:
            result = search_results[0]
            video_id = result.get('videoId')
            return video_id
        return None
    except Exception as e:
        print(f"      ⚠️  YouTube search error: {e}")
        return None


def fetch_deezer_id(title, artist):
    """Fetch Deezer ID by searching Deezer API"""
    try:
        search_query = f"{title} {artist}"
        url = f"https://api.deezer.com/search/track?q={search_query}"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if 'data' in data and len(data['data']) > 0:
            track = data['data'][0]
            deezer_id = str(track['id'])
            return deezer_id
        return None
    except Exception as e:
        print(f"      ⚠️  Deezer search error: {e}")
        return None


def refetch_ids_for_duplicates(duplicate_songs, id_type):
    """Re-fetch IDs for duplicate songs
    
    Args:
        duplicate_songs: List of songs with duplicate IDs
        id_type: 'youtube' or 'deezer'
    
    Returns:
        List of tuples: (song, new_id, id_type)
    """
    print(f"      🔄 Re-fetching {id_type} IDs for each song...")
    
    ytmusic = YTMusic() if id_type == 'youtube' else None
    results = []
    
    for song in duplicate_songs:
        title = song['title']
        artist = song['artist']
        
        print(f"         🔍 '{title}' by {artist}")
        
        if id_type == 'youtube':
            new_id = fetch_youtube_id(ytmusic, title, artist)
        else:  # deezer
            new_id = fetch_deezer_id(title, artist)
            time.sleep(0.3)  # Rate limiting
        
        if new_id:
            old_id = song['youtubeId'] if id_type == 'youtube' else song['deezerId']
            if new_id != old_id:
                print(f"            ✅ Found: {new_id} (was: {old_id})")
                results.append((song, new_id, id_type))  # Include id_type
            else:
                print(f"            ⚠️  Same ID: {new_id}")
                # Don't add to results if it's the same
        else:
            print(f"            ❌ Not found")
    
    return results


def check_duplicates(songs):
    """Check for duplicate IDs and titles"""
    # Track duplicates
    deezer_map = defaultdict(list)
    youtube_map = defaultdict(list)
    title_map = defaultdict(list)
    
    # Build maps
    for song in songs:
        deezer_map[song['deezerId']].append(song)
        youtube_map[song['youtubeId']].append(song)
        title_map[song['title'].lower()].append(song)
    
    # Find duplicates
    deezer_dupes = {k: v for k, v in deezer_map.items() if len(v) > 1}
    youtube_dupes = {k: v for k, v in youtube_map.items() if len(v) > 1}
    title_dupes = {k: v for k, v in title_map.items() if len(v) > 1}
    
    return deezer_dupes, youtube_dupes, title_dupes


def print_duplicates_and_refetch(deezer_dupes, youtube_dupes, title_dupes):
    """Print duplicate report and re-fetch correct IDs"""
    has_duplicates = False
    all_fixes = []
    
    # Deezer ID duplicates
    if deezer_dupes:
        has_duplicates = True
        print("🔴 DUPLICATE DEEZER IDs FOUND:\n")
        for deezer_id, songs in deezer_dupes.items():
            print(f"  Deezer ID: {deezer_id}")
            for song in songs:
                file_short = song['file'].replace('src/data/', '')
                print(f"    - '{song['title']}' by {song['artist']} ({song['year']}) [{file_short}]")
            
            # Re-fetch correct IDs
            print()
            fixes = refetch_ids_for_duplicates(songs, 'deezer')
            all_fixes.extend(fixes)
            print()
    
    # YouTube ID duplicates
    if youtube_dupes:
        has_duplicates = True
        print("🔴 DUPLICATE YOUTUBE IDs FOUND:\n")
        for youtube_id, songs in youtube_dupes.items():
            print(f"  YouTube ID: {youtube_id}")
            for song in songs:
                file_short = song['file'].replace('src/data/', '')
                print(f"    - '{song['title']}' by {song['artist']} ({song['year']}) [{file_short}]")
            
            # Re-fetch correct IDs
            print()
            fixes = refetch_ids_for_duplicates(songs, 'youtube')
            all_fixes.extend(fixes)
            print()
    
    # Title duplicates (no re-fetch needed, just informational)
    if title_dupes:
        has_duplicates = True
        print("🔴 DUPLICATE TITLES FOUND (case-insensitive):\n")
        for title_lower, songs in title_dupes.items():
            print(f"  Title: '{songs[0]['title']}'")
            for song in songs:
                file_short = song['file'].replace('src/data/', '')
                print(f"    - by {song['artist']} ({song['year']}) [YouTube: {song['youtubeId']}, Deezer: {song['deezerId']}] [{file_short}]")
            print()
    
    return has_duplicates, all_fixes


def apply_fixes(fixes):
    """Apply fixes to the data files"""
    if not fixes:
        return
    
    print("\n🔧 APPLYING FIXES...\n")
    
    # Group fixes by file
    fixes_by_file = defaultdict(list)
    for song, new_id, id_type in fixes:
        fixes_by_file[song['file']].append((song, new_id, id_type))
    
    # Apply fixes to each file
    for filename, file_fixes in fixes_by_file.items():
        print(f"📝 Updating {filename}...")
        
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for song, new_id, id_type in file_fixes:
                # Get old ID based on type
                old_id = song['youtubeId'] if id_type == 'youtube' else song['deezerId']
                field_name = 'youtubeId' if id_type == 'youtube' else 'deezerId'
                
                # Create pattern to find this specific song and replace the ID
                title_escaped = re.escape(song['title'])
                artist_escaped = re.escape(song['artist'])
                old_id_escaped = re.escape(old_id)
                
                # Build pattern based on whether we're replacing youtube or deezer
                # Format: { title: "...", artist: "...", year: ..., youtubeId: "...", deezerId: "..." }
                if id_type == 'youtube':
                    # Match: title, artist, year, then youtubeId field
                    pattern = (
                        f'(\\{{\\s*title:\\s*"{title_escaped}",\\s*'
                        f'artist:\\s*"{artist_escaped}",\\s*'
                        f'year:\\s*{song["year"]},\\s*'
                        f'youtubeId:\\s*")({old_id_escaped})(")'
                    )
                else:  # deezer
                    # Match: title, artist, year, youtubeId, then deezerId field
                    pattern = (
                        f'(\\{{\\s*title:\\s*"{title_escaped}",\\s*'
                        f'artist:\\s*"{artist_escaped}",\\s*'
                        f'year:\\s*{song["year"]},\\s*'
                        f'youtubeId:\\s*"[^"]+",\\s*'
                        f'deezerId:\\s*")({old_id_escaped})(")'
                    )
                
                # Replace old ID with new ID
                new_content = re.sub(pattern, r'\g<1>' + new_id + r'\g<3>', content)
                
                if new_content != content:
                    content = new_content
                    print(f"   ✅ '{song['title']}' ({field_name}): {old_id} → {new_id}")
                else:
                    print(f"   ⚠️  Could not find pattern for '{song['title']}'")
            
            # Write back
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print()
            
        except Exception as e:
            print(f"   ❌ Error updating file: {e}\n")


def main():
    # Check for --fix flag
    auto_fix = '--fix' in sys.argv
    
    print("🔍 TIMESONG DUPLICATE CHECKER")
    if auto_fix:
        print("   (Auto-fix mode: Will update files with correct IDs)")
    print()
    
    # Load songs from both files
    english_songs = load_songs_from_file('src/data/english.js')
    spanish_songs = load_songs_from_file('src/data/spanish.js')
    
    print(f"📊 Loaded {len(english_songs)} English songs")
    print(f"📊 Loaded {len(spanish_songs)} Spanish songs")
    print(f"📊 Total: {len(english_songs) + len(spanish_songs)} songs\n")
    
    # Combine all songs
    all_songs = english_songs + spanish_songs
    
    if not all_songs:
        print("❌ No songs loaded!")
        sys.exit(1)
    
    # Check for duplicates
    deezer_dupes, youtube_dupes, title_dupes = check_duplicates(all_songs)
    
    # Print results
    print("=" * 60)
    print()
    
    has_duplicates, fixes = print_duplicates_and_refetch(deezer_dupes, youtube_dupes, title_dupes)
    
    if not has_duplicates:
        print("✅ NO DUPLICATES FOUND!")
        print("   All Deezer IDs, YouTube IDs, and titles are unique.\n")
    else:
        print("=" * 60)
        print()
        print("💡 SUMMARY:")
        if deezer_dupes:
            print(f"   - {len(deezer_dupes)} duplicate Deezer ID(s)")
        if youtube_dupes:
            print(f"   - {len(youtube_dupes)} duplicate YouTube ID(s)")
        if title_dupes:
            print(f"   - {len(title_dupes)} duplicate title(s)")
        print()
        
        # Apply fixes if requested
        if auto_fix and fixes:
            apply_fixes(fixes)
            print("✅ Files updated! Run script again to verify fixes.\n")
        elif fixes:
            print("💡 TIP: Run with --fix flag to automatically update files:")
            print("   python3 scripts/check-duplicates.py --fix\n")


if __name__ == '__main__':
    main()
