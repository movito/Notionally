# LinkedIn Video Capture Strategy

## How LinkedIn Videos Work

LinkedIn uses streaming video technology similar to YouTube:
- Videos are served as HLS streams (`.m3u8` playlists) or direct MP4s
- The browser creates blob URLs for playback
- Actual video URLs contain authentication tokens

## Our Capture Approach

### 1. Network Interception (Greasemonkey Script v1.3.4)
The script intercepts all network requests to capture real video URLs:

```javascript
// Intercepts fetch() and XMLHttpRequest
// Captures URLs containing: .m3u8, .mp4, dms.licdn.com
// Stores them for later use when extracting post data
```

### 2. Video URL Matching
When a video element is found:
1. Check captured URLs for matching video
2. Match by URN or container attributes
3. Use most recent captured URL as fallback

### 3. Download Methods

#### Direct MP4 Files
- Simple HTTP download with LinkedIn headers
- Includes User-Agent and Referer

#### HLS Streams (.m3u8)
- Uses ffmpeg to download and convert
- Automatically handles:
  - Playlist parsing
  - Segment downloading
  - Stream concatenation
  - Format conversion to MP4

## Technical Details

### Supported Formats
- **HLS/m3u8**: HTTP Live Streaming playlists
- **MP4**: Direct progressive downloads
- **Authenticated URLs**: Tokens preserved from browser

### FFmpeg Integration
```bash
ffmpeg -user_agent "Mozilla/5.0..." \
       -referer "https://www.linkedin.com/" \
       -i "https://.../.m3u8" \
       -c copy \
       output.mp4
```

### Authentication
LinkedIn video URLs include auth tokens:
- Captured from browser where user is logged in
- Passed to server with tokens intact
- Server uses same headers as browser

## Requirements

1. **FFmpeg installed** - For HLS stream processing
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   ```

2. **Node 22+** - For native fetch support

3. **Greasemonkey script v1.3.4+** - With network interception

## Current Limitations

1. **Native LinkedIn Videos** - Some videos uploaded directly to LinkedIn may use additional DRM or protection
2. **Timing** - Video URLs must be captured before extraction (requires video to start loading)
3. **Token Expiry** - URLs with auth tokens may expire after some time

## Success Rate

- **External videos** (YouTube embeds, etc.): ❌ Not supported
- **LinkedIn-hosted MP4s**: ✅ High success rate
- **LinkedIn HLS streams**: ✅ Good success with ffmpeg
- **Protected/DRM content**: ❌ Cannot download

## Debugging

Check browser console for:
```
[notionally] Captured potential video URL: https://...
[notionally] Videos with stream URLs: 1/1
```

Check server logs for:
```
🎬 Detected HLS stream, using ffmpeg to download...
✅ HLS stream downloaded successfully
```

## Future Improvements

1. **Fallback to browser recording** - Use MediaRecorder API for blob URLs
2. **Proxy approach** - Run browser traffic through local proxy to capture all URLs
3. **Headless browser** - Use Puppeteer/Playwright for full control
4. **WebRTC capture** - For live streams or special video players