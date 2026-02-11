"""
Common utilities for ChronoTunes scripts

Shared functions for fetching song metadata from various APIs:
- YouTube Music (via ytmusicapi)
- Deezer API

Usage:
    from common import fetch_youtube_id, fetch_deezer_id, get_deezer_data_with_year
"""

import requests


def fetch_youtube_id(ytmusic, title, artist):
    """
    Fetch YouTube ID by searching YouTube Music
    
    Args:
        ytmusic: YTMusic instance
        title: Song title
        artist: Artist name
    
    Returns:
        str: Video ID if found, None otherwise
    """
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


def fetch_youtube_data(ytmusic, title, artist):
    """
    Fetch YouTube ID, title, and artist by searching YouTube Music
    Returns full metadata from YouTube for more accurate data
    
    Args:
        ytmusic: YTMusic instance
        title: Song title
        artist: Artist name
    
    Returns:
        tuple: (video_id, youtube_title, youtube_artist) or (None, None, None)
    """
    try:
        search_query = f"{title} {artist}"
        search_results = ytmusic.search(search_query, filter="songs", limit=1)
        
        if search_results and len(search_results) > 0:
            result = search_results[0]
            video_id = result.get('videoId')
            youtube_title = result.get('title', title)  # Fallback to original
            
            # Get artist from YouTube (might be list or string)
            youtube_artists = result.get('artists', [])
            if isinstance(youtube_artists, list) and len(youtube_artists) > 0:
                youtube_artist = youtube_artists[0].get('name', artist)
            else:
                youtube_artist = artist  # Fallback to original
            
            return video_id, youtube_title, youtube_artist
        return None, None, None
    except Exception as e:
        print(f"      ⚠️  YouTube search error: {e}")
        return None, None, None


def fetch_deezer_id(title, artist):
    """
    Fetch Deezer track ID by searching Deezer API
    Simple search that returns the first match
    
    Args:
        title: Song title
        artist: Artist name
    
    Returns:
        str: Deezer track ID if found, None otherwise
    """
    try:
        search_query = f"{title} {artist}"
        url = "https://api.deezer.com/search/track"
        params = {'q': search_query}
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if 'data' in data and len(data['data']) > 0:
            track = data['data'][0]
            deezer_id = str(track['id'])
            return deezer_id
        return None
    except Exception as e:
        print(f"      ⚠️  Deezer search error: {e}")
        return None


def get_deezer_data_with_year(title, artist):
    """
    Fetch Deezer track ID and release year
    Filters out remasters/compilations by checking album titles
    Returns the earliest (most likely original) version
    
    Args:
        title: Song title
        artist: Artist name
    
    Returns:
        dict: {'deezerId': str, 'year': int, 'album': str} or None
    """
    try:
        search_query = f"{title} {artist}"
        url = "https://api.deezer.com/search/track"
        params = {'q': search_query, 'limit': 10}
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        
        if not data.get('data'):
            return None
        
        # Find best match (non-remaster, earliest release)
        best_match = None
        earliest_year = None
        
        for track in data['data']:
            album_title = track.get('album', {}).get('title', '').lower()
            album_id = track.get('album', {}).get('id')
            
            # Skip remasters, compilations, deluxe editions
            skip_keywords = ['remaster', 'deluxe', 'edition', 'anniversary', 'greatest', 'best of', 'compilation', 'hits']
            if any(keyword in album_title for keyword in skip_keywords):
                continue
            
            # Get album release date
            if not album_id:
                continue
            
            try:
                album_url = f"https://api.deezer.com/album/{album_id}"
                album_data = requests.get(album_url, timeout=10).json()
                release_date = album_data.get('release_date', '')
                
                if not release_date:
                    continue
                
                year = int(release_date.split('-')[0])
                
                # Skip unrealistic years
                if year < 1950 or year > 2026:
                    continue
                
                # Track earliest (most likely original)
                if earliest_year is None or year < earliest_year:
                    earliest_year = year
                    best_match = {
                        'deezerId': str(track['id']),
                        'year': year,
                        'album': album_title
                    }
            except:
                continue
        
        return best_match
        
    except Exception:
        return None


def clean_artist_name(artists):
    """
    Clean artist name from YouTube Music API response
    
    Args:
        artists: List of artist dicts or string
    
    Returns:
        str: Cleaned artist name
    """
    if isinstance(artists, list) and len(artists) > 0:
        if isinstance(artists[0], dict):
            return artists[0].get('name', 'Unknown Artist')
        return str(artists[0])
    elif isinstance(artists, str):
        return artists
    return 'Unknown Artist'
