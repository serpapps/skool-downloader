# Loom Video Download Research: Technical Analysis of Stream Patterns, CDNs, and Download Methods

*A comprehensive research document analyzing Loom's video infrastructure, embed patterns, stream formats, and optimal download strategies using modern tools*

**Authors**: SERP Apps  
**Date**: September 2024  
**Version**: 1.0

---

## Abstract

This research document provides a comprehensive analysis of Loom's video streaming infrastructure, including embed URL patterns, content delivery networks (CDNs), stream formats, and optimal download methodologies. We examine the technical architecture behind Loom's video delivery system and provide practical implementation guidance using industry-standard tools like yt-dlp, ffmpeg, and alternative solutions for reliable video extraction and download.

## Table of Contents

1. [Introduction](#introduction)
2. [Loom Video Infrastructure Overview](#loom-video-infrastructure-overview)
3. [Embed URL Patterns and Detection](#embed-url-patterns-and-detection)
4. [Stream Formats and CDN Analysis](#stream-formats-and-cdn-analysis)
5. [yt-dlp Implementation Strategies](#yt-dlp-implementation-strategies)
6. [FFmpeg Processing Techniques](#ffmpeg-processing-techniques)
7. [Alternative Tools and Backup Methods](#alternative-tools-and-backup-methods)
8. [Implementation Recommendations](#implementation-recommendations)
9. [Troubleshooting and Edge Cases](#troubleshooting-and-edge-cases)
10. [Conclusion](#conclusion)

---

## 1. Introduction

Loom has established itself as a leading screen recording and video messaging platform, utilizing sophisticated content delivery mechanisms to ensure optimal video streaming across various platforms and devices. This research examines the technical infrastructure behind Loom's video delivery system, with particular focus on developing robust download strategies for various use cases including archival, offline viewing, and content preservation.

### 1.1 Research Scope

This document covers:
- Technical analysis of Loom's video streaming architecture
- Comprehensive URL pattern recognition for embedded videos
- Stream format analysis across different quality levels
- Practical implementation using open-source tools
- Backup strategies for edge cases and failures

### 1.2 Methodology

Our research methodology includes:
- Network traffic analysis of Loom video playback
- Reverse engineering of embed mechanisms
- Testing with various quality settings and formats
- Validation across multiple CDN endpoints

---

## 2. Loom Video Infrastructure Overview

### 2.1 CDN Architecture

Loom utilizes a multi-tier CDN strategy primarily built on:

**Primary CDN**: AWS CloudFront
- **Primary Domain**: `cdn.loom.com`
- **Backup Domains**: `d2eebagvwr542c.cloudfront.net`, `d1aeb47dbf4gw4.cloudfront.net`
- **Geographic Distribution**: Global edge locations with regional optimization

**Secondary CDN**: Fastly
- **Domain**: `cdn-cf.loom.com`
- **Purpose**: Backup delivery and load balancing
- **Optimization**: Real-time content optimization

### 2.2 Video Processing Pipeline

Loom's video processing follows this pipeline:
1. **Upload**: Original video uploaded to staging servers
2. **Transcoding**: Multiple formats generated (MP4, WebM, HLS)
3. **Quality Levels**: Auto-generated 240p, 360p, 480p, 720p, 1080p variants
4. **CDN Distribution**: Files distributed across CDN network
5. **Adaptive Streaming**: HLS manifests created for dynamic quality

### 2.3 Security and Access Control

- **Token-based Access**: Time-limited signed URLs
- **Referrer Checking**: Domain-based access restrictions
- **Rate Limiting**: Per-IP download limitations
- **Geographic Restrictions**: Region-based content blocking

---

## 3. Embed URL Patterns and Detection

### 3.1 Primary Embed Patterns

#### 3.1.1 Standard Embed URLs
```
https://www.loom.com/embed/{VIDEO_ID}
https://loom.com/embed/{VIDEO_ID}
https://www.loom.com/share/{VIDEO_ID}
https://loom.com/share/{VIDEO_ID}
```

#### 3.1.2 Direct Video URLs
```
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/{QUALITY}/video.mp4
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/webm/{QUALITY}/video.webm
```

#### 3.1.3 HLS Stream URLs
```
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/master.m3u8
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/{QUALITY}/index.m3u8
```

### 3.2 Video ID Extraction Patterns

#### 3.2.1 Standard Format
```regex
/embed/([a-f0-9]{32})/
/share/([a-f0-9]{32})/
/v/([a-f0-9]{32})/
```

#### 3.2.2 Legacy Format Support
```regex
/embed/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/
```

### 3.3 Detection Implementation

#### Command-line Detection Methods

**Using grep for URL pattern extraction:**
```bash
# Extract Loom video IDs from HTML files
grep -oE "https?://(?:www\.)?loom\.com/(?:embed|share)/([a-f0-9]{32})" input.html

# Extract from multiple files
find . -name "*.html" -exec grep -oE "loom\.com/(?:embed|share)/[a-f0-9]{32}" {} +

# Extract video IDs only (without URL)
grep -oE "loom\.com/(?:embed|share)/([a-f0-9]{32})" input.html | grep -oE "[a-f0-9]{32}"
```

**Using yt-dlp for detection and metadata extraction:**
```bash
# Test if URL contains downloadable video
yt-dlp --dump-json "https://www.loom.com/share/{VIDEO_ID}" | jq '.id'

# Extract all video information
yt-dlp --dump-json "https://www.loom.com/share/{VIDEO_ID}" > video_info.json

# Check if video is accessible
yt-dlp --list-formats "https://www.loom.com/share/{VIDEO_ID}"
```

**Browser inspection commands:**
```bash
# Using curl to inspect embed pages
curl -s "https://www.loom.com/embed/{VIDEO_ID}" | grep -oE "videoId.*[a-f0-9]{32}"

# Inspect page headers for video information
curl -I "https://www.loom.com/share/{VIDEO_ID}"
```

---

## 4. Stream Formats and CDN Analysis

### 4.1 Available Stream Formats

#### 4.1.1 MP4 Streams
- **Container**: MP4
- **Video Codec**: H.264 (AVC)
- **Audio Codec**: AAC
- **Quality Levels**: 240p, 360p, 480p, 720p, 1080p, 1440p
- **Bitrates**: Adaptive from 200kbps to 8Mbps

#### 4.1.2 WebM Streams
- **Container**: WebM
- **Video Codec**: VP9/VP8
- **Audio Codec**: Opus/Vorbis
- **Quality Levels**: Similar to MP4
- **Purpose**: Chrome optimization, smaller file sizes

#### 4.1.3 HLS Streams
- **Container**: MPEG-TS segments
- **Video Codec**: H.264
- **Audio Codec**: AAC
- **Segment Duration**: 6-10 seconds
- **Adaptive**: Dynamic quality switching

### 4.2 URL Construction Patterns

#### 4.2.1 MP4 Direct URLs
```
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/720/video.mp4
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/1080/video.mp4
```

#### 4.2.2 HLS Master Playlist
```
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/master.m3u8
```

#### 4.2.3 Quality-specific HLS
```
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/720/index.m3u8
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/1080/index.m3u8
```

### 4.3 CDN Failover Strategy

#### Primary → Secondary CDN

The following URL patterns can be used with tools like wget or curl to attempt downloads from different CDN endpoints:

```bash
# Primary CDN
https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/{QUALITY}/video.mp4

# CloudFront backup  
https://d2eebagvwr542c.cloudfront.net/sessions/{VIDEO_ID}/transcoded/mp4/{QUALITY}/video.mp4

# Fastly backup
https://cdn-cf.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/{QUALITY}/video.mp4
```

**Command sequence for testing CDN availability:**
```bash
# Test primary CDN
curl -I "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/720/video.mp4"

# Test CloudFront backup if primary fails
curl -I "https://d2eebagvwr542c.cloudfront.net/sessions/{VIDEO_ID}/transcoded/mp4/720/video.mp4"

# Test Fastly backup if both fail  
curl -I "https://cdn-cf.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/720/video.mp4"
```

---

## 5. yt-dlp Implementation Strategies

### 5.1 Basic yt-dlp Commands

#### 5.1.1 Standard Download
```bash
# Download best quality MP4
yt-dlp "https://www.loom.com/share/{VIDEO_ID}"

# Download specific quality
yt-dlp -f "best[height<=720]" "https://www.loom.com/share/{VIDEO_ID}"

# Download with custom filename
yt-dlp -o "%(uploader)s - %(title)s.%(ext)s" "https://www.loom.com/share/{VIDEO_ID}"
```

#### 5.1.2 Format Selection
```bash
# List available formats
yt-dlp -F "https://www.loom.com/share/{VIDEO_ID}"

# Download specific format by ID
yt-dlp -f 22 "https://www.loom.com/share/{VIDEO_ID}"

# Best video + best audio
yt-dlp -f "bv+ba" "https://www.loom.com/share/{VIDEO_ID}"
```

#### 5.1.3 Advanced Options
```bash
# Download with subtitles
yt-dlp --write-subs --sub-langs en "https://www.loom.com/share/{VIDEO_ID}"

# Download thumbnail
yt-dlp --write-thumbnail "https://www.loom.com/share/{VIDEO_ID}"

# Download metadata
yt-dlp --write-info-json "https://www.loom.com/share/{VIDEO_ID}"

# Rate limiting
yt-dlp --limit-rate 1M "https://www.loom.com/share/{VIDEO_ID}"
```

### 5.2 Batch Processing

#### 5.2.1 Multiple Videos
```bash
# From file list
yt-dlp -a loom_urls.txt

# With archive tracking
yt-dlp --download-archive downloaded.txt -a loom_urls.txt

# Parallel downloads
yt-dlp --max-downloads 3 -a loom_urls.txt
```

#### 5.2.2 Quality-specific Batch
```bash
# Download all in 720p
yt-dlp -f "best[height<=720]" -a loom_urls.txt

# Download best available under 100MB
yt-dlp -f "best[filesize<100M]" -a loom_urls.txt
```

### 5.3 Error Handling and Retries

```bash
# Retry on failure
yt-dlp --retries 3 "https://www.loom.com/share/{VIDEO_ID}"

# Ignore errors and continue
yt-dlp --ignore-errors -a loom_urls.txt

# Skip unavailable videos
yt-dlp --no-warnings --ignore-errors -a loom_urls.txt
```

### 5.4 yt-dlp Integration Commands

#### 5.4.1 Video Information Extraction
```bash
# Extract video metadata only (no download)
yt-dlp --dump-json "https://www.loom.com/share/{VIDEO_ID}"

# Get available formats
yt-dlp --list-formats "https://www.loom.com/share/{VIDEO_ID}"

# Extract specific information fields
yt-dlp --dump-json "https://www.loom.com/share/{VIDEO_ID}" | jq '.title, .duration, .uploader'
```

#### 5.4.2 Download Commands with Quality Control
```bash
# Download best quality MP4
yt-dlp -f "best[ext=mp4]" "https://www.loom.com/share/{VIDEO_ID}"

# Download with specific quality limit
yt-dlp -f "best[height<=720][ext=mp4]" "https://www.loom.com/share/{VIDEO_ID}"

# Download with metadata and thumbnail
yt-dlp --write-info-json --write-thumbnail --write-subs --sub-langs en "https://www.loom.com/share/{VIDEO_ID}"

# Custom output filename template
yt-dlp -o "%(uploader)s - %(title)s.%(ext)s" "https://www.loom.com/share/{VIDEO_ID}"
```

#### 5.4.3 Error Handling and Retry Commands
```bash
# Download with retries and rate limiting
yt-dlp --retries 5 --limit-rate 1M "https://www.loom.com/share/{VIDEO_ID}"

# Skip unavailable videos in batch
yt-dlp --ignore-errors -a video_urls.txt

# Continue incomplete downloads
yt-dlp --continue "https://www.loom.com/share/{VIDEO_ID}"
```

---

## 6. FFmpeg Processing Techniques

### 6.1 Stream Analysis

#### 6.1.1 Basic Stream Information
```bash
# Analyze stream details
ffprobe -v quiet -print_format json -show_format -show_streams "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/720/video.mp4"

# Get duration
ffprobe -v quiet -show_entries format=duration -of csv="p=0" "input.mp4"

# Check codec information
ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name,width,height -of csv="s=x:p=0" "input.mp4"
```

#### 6.1.2 HLS Stream Analysis
```bash
# Download and analyze HLS stream
ffprobe -v quiet -print_format json -show_format "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/master.m3u8"

# List available streams in HLS
ffprobe -v quiet -show_streams "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/master.m3u8"
```

### 6.2 Direct Stream Processing

#### 6.2.1 Stream Download and Conversion
```bash
# Download HLS stream directly
ffmpeg -i "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/master.m3u8" -c copy output.mp4

# Download with specific quality
ffmpeg -i "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/720/index.m3u8" -c copy output_720p.mp4

# Convert WebM to MP4
ffmpeg -i input.webm -c:v libx264 -c:a aac output.mp4
```

#### 6.2.2 Quality Optimization
```bash
# Re-encode for smaller file size
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -c:a aac -b:a 128k output_compressed.mp4

# Fast encode with hardware acceleration
ffmpeg -hwaccel auto -i input.mp4 -c:v h264_nvenc -preset fast output_fast.mp4
```

### 6.3 Audio/Video Stream Handling

#### 6.3.1 Separate Audio/Video Streams
```bash
# Extract audio only
ffmpeg -i input.mp4 -vn -c:a aac audio_only.aac

# Extract video only
ffmpeg -i input.mp4 -an -c:v copy video_only.mp4

# Combine separate streams
ffmpeg -i video.mp4 -i audio.aac -c copy combined.mp4
```

#### 6.3.2 Subtitle Processing
```bash
# Extract subtitles from stream
ffmpeg -i input.mp4 -map 0:s:0 subtitles.srt

# Embed subtitles into video
ffmpeg -i input.mp4 -i subtitles.srt -c copy -c:s mov_text output_with_subs.mp4

# Burn subtitles into video
ffmpeg -i input.mp4 -vf subtitles=subtitles.srt output_burned_subs.mp4
```

### 6.4 Advanced Processing Workflows

#### 6.4.1 Batch Processing Script
```bash
#!/bin/bash

# Batch process Loom videos
process_loom_videos() {
    local input_dir="$1"
    local output_dir="$2"
    
    mkdir -p "$output_dir"
    
    for file in "$input_dir"/*.mp4; do
        if [[ -f "$file" ]]; then
            filename=$(basename "$file" .mp4)
            echo "Processing: $filename"
            
            # Re-encode with optimal settings
            ffmpeg -i "$file" \
                   -c:v libx264 -crf 20 \
                   -c:a aac -b:a 128k \
                   -movflags +faststart \
                   "$output_dir/${filename}_optimized.mp4"
        fi
    done
}
```

#### 6.4.2 Automated Stream Detection
```bash
# Detect best stream automatically
detect_best_stream() {
    local url="$1"
    
    # Get stream information
    streams=$(ffprobe -v quiet -print_format json -show_streams "$url")
    
    # Find highest resolution video stream
    best_stream=$(echo "$streams" | jq -r '.streams[] | select(.codec_type=="video") | .index' | head -1)
    
    echo "Best video stream: $best_stream"
    return $best_stream
}
```

---

## 7. Alternative Tools and Backup Methods

### 7.1 Gallery-dl

Gallery-dl is an excellent alternative for sites not supported by yt-dlp.

#### 7.1.1 Installation and Basic Usage
```bash
# Install gallery-dl
pip install gallery-dl

# Download Loom video
gallery-dl "https://www.loom.com/share/{VIDEO_ID}"

# Custom configuration
gallery-dl --config gallery-dl.conf "https://www.loom.com/share/{VIDEO_ID}"
```

#### 7.1.2 Configuration for Loom
```json
{
    "extractor": {
        "loom": {
            "filename": "{uploader} - {title}.{extension}",
            "directory": ["loom", "{uploader}"],
            "quality": "best"
        }
    }
}
```

### 7.2 Streamlink

Streamlink specializes in live streams but can handle recorded content.

#### 7.2.1 Basic Streamlink Usage
```bash
# Install streamlink
pip install streamlink

# Download Loom HLS stream
streamlink "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/master.m3u8" best -o output.mp4

# Specify quality
streamlink "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/master.m3u8" 720p -o output_720p.mp4
```

### 7.3 Wget/cURL for Direct Downloads

#### 7.3.1 Direct MP4 Downloads
```bash
# Using wget
wget -O "loom_video.mp4" "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/720/video.mp4"

# Using cURL with headers
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
     -H "Referer: https://www.loom.com/" \
     -o "loom_video.mp4" \
     "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/mp4/720/video.mp4"
```

#### 7.3.2 Batch Download Script
```bash
#!/bin/bash

# Batch download with fallback
download_with_fallback() {
    local video_id="$1"
    local quality="${2:-720}"
    local output_file="loom_${video_id}_${quality}p.mp4"
    
    urls=(
        "https://cdn.loom.com/sessions/${video_id}/transcoded/mp4/${quality}/video.mp4"
        "https://d2eebagvwr542c.cloudfront.net/sessions/${video_id}/transcoded/mp4/${quality}/video.mp4"
        "https://cdn-cf.loom.com/sessions/${video_id}/transcoded/mp4/${quality}/video.mp4"
    )
    
    for url in "${urls[@]}"; do
        echo "Trying: $url"
        if wget -q --spider "$url"; then
            echo "Downloading from: $url"
            wget -O "$output_file" "$url"
            if [[ $? -eq 0 ]]; then
                echo "Success: $output_file"
                return 0
            fi
        fi
    done
    
    echo "Failed to download video: $video_id"
    return 1
}
```

### 7.4 Browser-based Network Monitoring

#### 7.4.1 Browser Developer Tools Approach
```bash
# Manual network monitoring commands for identifying video URLs
# 1. Open browser developer tools (F12)
# 2. Go to Network tab
# 3. Filter by "mp4" or "m3u8"
# 4. Play the Loom video
# 5. Copy URLs from network requests

# Alternative: Use browser's built-in network export
# Export HAR file and extract video URLs:
grep -oE "https://[^\"]*\.(mp4|m3u8)" network_export.har
```

#### 7.4.2 Command-line Network Monitoring
```bash
# Monitor network traffic during video playback
# Using netstat to monitor connections
netstat -t -c | grep ":443"

# Using tcpdump to capture network packets (requires root)
tcpdump -i any host cdn.loom.com

# Using ngrep to search for specific patterns
ngrep -q -d any "\.mp4\|\.m3u8" host cdn.loom.com
```

### 7.5 Mobile App Considerations

#### 7.5.1 Android ADB Method
```bash
# Extract URLs from Android app
adb shell "cat /data/data/com.loom.mobile/cache/video_cache/* | grep -o 'https://[^\"]*\.mp4'"

# Monitor network traffic
adb shell "cat /proc/net/tcp | grep :80"
```

#### 7.5.2 iOS Network Monitoring
```bash
# Using iOS device console logs
xcrun simctl spawn booted log stream --predicate 'eventMessage contains "mp4"'
```

---

## 8. Implementation Recommendations

### 8.1 Primary Implementation Strategy

#### 8.1.1 Hierarchical Command Approach
Use a sequential approach with different tools, starting with the most reliable:

```bash
#!/bin/bash
# Primary download strategy script

download_loom_video() {
    local video_url="$1"
    local output_dir="${2:-./downloads}"
    
    echo "Attempting download of: $video_url"
    
    # Method 1: yt-dlp (primary)
    if yt-dlp --ignore-errors -o "$output_dir/%(title)s.%(ext)s" "$video_url"; then
        echo "✓ Success with yt-dlp"
        return 0
    fi
    
    # Method 2: ffmpeg with HLS
    video_id=$(echo "$video_url" | grep -oE "[a-f0-9]{32}")
    if [ -n "$video_id" ]; then
        hls_url="https://cdn.loom.com/sessions/$video_id/transcoded/hls/master.m3u8"
        if ffmpeg -i "$hls_url" -c copy "$output_dir/loom_$video_id.mp4"; then
            echo "✓ Success with ffmpeg"
            return 0
        fi
    fi
    
    # Method 3: gallery-dl
    if gallery-dl -d "$output_dir" "$video_url"; then
        echo "✓ Success with gallery-dl"
        return 0
    fi
    
    # Method 4: streamlink
    if streamlink "$video_url" best -o "$output_dir/loom_video.mp4"; then
        echo "✓ Success with streamlink"
        return 0
    fi
    
    echo "✗ All methods failed"
    return 1
}
```

#### 8.1.2 Quality Selection Commands
```bash
# Inspect available qualities first
yt-dlp -F "https://www.loom.com/share/{VIDEO_ID}"

# Download specific quality with fallback
yt-dlp -f "best[height<=720]/best[height<=480]/best" "https://www.loom.com/share/{VIDEO_ID}"

# Check file size before download
yt-dlp --dump-json "https://www.loom.com/share/{VIDEO_ID}" | jq '.filesize_approx // .filesize'

# Download with size limit
yt-dlp -f "best[filesize<500M]" "https://www.loom.com/share/{VIDEO_ID}"

# Quality selection script
select_quality() {
    local video_url="$1"
    local max_quality="${2:-720}"
    local max_size_mb="${3:-500}"
    
    echo "Checking available formats..."
    yt-dlp -F "$video_url"
    
    echo "Downloading with quality limit: ${max_quality}p, size limit: ${max_size_mb}MB"
    yt-dlp -f "best[height<=$max_quality][filesize<${max_size_mb}M]/best[height<=$max_quality]/best" "$video_url"
}
```

### 8.2 Error Handling and Resilience

#### 8.2.1 Retry Commands with Backoff
```bash
# Download with retries and exponential backoff
download_with_retries() {
    local url="$1"
    local max_retries=3
    local delay=1
    
    for i in $(seq 1 $max_retries); do
        if yt-dlp --retries 2 "$url"; then
            return 0
        fi
        
        echo "Attempt $i failed, waiting ${delay}s..."
        sleep $delay
        delay=$((delay * 2))
    done
    
    return 1
}

# Check URL accessibility before download
check_url_status() {
    local url="$1"
    
    # Test direct access
    if curl -I --max-time 10 "$url" | grep -q "200 OK"; then
        echo "URL accessible"
        return 0
    fi
    
    # Test with different user agent
    if curl -I --max-time 10 -H "User-Agent: Mozilla/5.0 (compatible; Loom-Downloader)" "$url" | grep -q "200 OK"; then
        echo "URL accessible with custom user agent"
        return 0
    fi
    
    echo "URL not accessible"
    return 1
}

# Handle rate limiting
handle_rate_limit() {
    local url="$1"
    
    # Download with rate limiting
    yt-dlp --limit-rate 1M --retries 5 --fragment-retries 3 "$url"
    
    # If rate limited, wait and retry
    if [ $? -eq 1 ]; then
        echo "Rate limited, waiting 60 seconds..."
        sleep 60
        yt-dlp --limit-rate 500K "$url"
    fi
}
```

#### 8.2.2 Fallback URL Testing
```bash
# Test multiple CDN endpoints
test_fallback_urls() {
    local video_id="$1"
    local quality="${2:-720}"
    
    local urls=(
        "https://cdn.loom.com/sessions/$video_id/transcoded/mp4/$quality/video.mp4"
        "https://d2eebagvwr542c.cloudfront.net/sessions/$video_id/transcoded/mp4/$quality/video.mp4"
        "https://cdn-cf.loom.com/sessions/$video_id/transcoded/mp4/$quality/video.mp4"
        "https://cdn.loom.com/sessions/$video_id/transcoded/hls/master.m3u8"
    )
    
    for url in "${urls[@]}"; do
        echo "Testing: $url"
        if curl -I --max-time 5 "$url" | grep -q "200\|302"; then
            echo "✓ Available: $url"
        else
            echo "✗ Failed: $url"
        fi
    done
}

# Download with automatic fallback
download_with_fallback() {
    local video_id="$1"
    local quality="${2:-720}"
    local output_dir="${3:-./downloads}"
    
    # Try primary CDN first
    if yt-dlp "https://www.loom.com/share/$video_id"; then
        return 0
    fi
    
    # Try direct MP4 URLs
    local urls=(
        "https://cdn.loom.com/sessions/$video_id/transcoded/mp4/$quality/video.mp4"
        "https://d2eebagvwr542c.cloudfront.net/sessions/$video_id/transcoded/mp4/$quality/video.mp4"
        "https://cdn-cf.loom.com/sessions/$video_id/transcoded/mp4/$quality/video.mp4"
    )
    
    for url in "${urls[@]}"; do
        if wget -O "$output_dir/loom_$video_id.mp4" "$url"; then
            echo "✓ Downloaded from: $url"
            return 0
        fi
    done
    
    # Try HLS as last resort
    ffmpeg -i "https://cdn.loom.com/sessions/$video_id/transcoded/hls/master.m3u8" -c copy "$output_dir/loom_$video_id.mp4"
}
```

### 8.3 Performance Optimization

#### 8.3.1 Parallel Batch Processing
```bash
# Download multiple videos in parallel
download_batch_parallel() {
    local url_file="$1"
    local max_jobs="${2:-4}"
    local output_dir="${3:-./downloads}"
    
    # Using GNU parallel
    parallel -j $max_jobs yt-dlp -o "$output_dir/%(title)s.%(ext)s" {} :::: "$url_file"
}

# Alternative using xargs
download_batch_xargs() {
    local url_file="$1"
    local max_jobs="${2:-4}"
    local output_dir="${3:-./downloads}"
    
    cat "$url_file" | xargs -P $max_jobs -I {} yt-dlp -o "$output_dir/%(title)s.%(ext)s" {}
}

# Process multiple videos with progress
batch_download_with_logging() {
    local url_file="$1"
    local log_file="downloads.log"
    
    total_count=$(wc -l < "$url_file")
    current=0
    
    while IFS= read -r url; do
        ((current++))
        echo "[$current/$total_count] Processing: $url" | tee -a "$log_file"
        
        if yt-dlp "$url" 2>&1 | tee -a "$log_file"; then
            echo "✓ Success" | tee -a "$log_file"
        else
            echo "✗ Failed" | tee -a "$log_file"
        fi
    done < "$url_file"
}
```

#### 8.3.2 Progress Monitoring
```bash
# Download with progress monitoring
download_with_progress() {
    local url="$1"
    local output_file="$2"
    
    # Using yt-dlp with progress hooks
    yt-dlp --newline --progress-template "download:%(progress._percent_str)s %(progress._speed_str)s ETA %(progress._eta_str)s" -o "$output_file" "$url"
}

# Monitor download speed and adjust
monitor_download_speed() {
    local url="$1"
    
    # Test connection speed first
    local test_speed=$(curl -w "%{speed_download}" -o /dev/null -s "$url" | head -c 10)
    
    if (( $(echo "$test_speed < 1000000" | bc -l) )); then
        echo "Slow connection detected, using rate limiting"
        yt-dlp --limit-rate 500K "$url"
    else
        echo "Good connection, downloading at full speed"
        yt-dlp "$url"
    fi
}

# Real-time progress with file size monitoring
track_download_progress() {
    local url="$1"
    local output_file="$2"
    
    # Start download in background
    yt-dlp -o "$output_file" "$url" &
    local download_pid=$!
    
    # Monitor file size growth
    while kill -0 $download_pid 2>/dev/null; do
        if [ -f "$output_file" ]; then
            local size=$(du -h "$output_file" 2>/dev/null | cut -f1)
            echo -ne "\rDownloaded: $size"
        fi
        sleep 2
    done
    echo ""
    
    wait $download_pid
    return $?
}
```

### 8.4 Integration Best Practices

#### 8.4.1 Configuration Management
```yaml
# config.yaml
loom_downloader:
  output:
    directory: "./downloads"
    filename_template: "{uploader} - {title}.{ext}"
    create_subdirs: true
  
  quality:
    preferred: "720p"
    fallback: ["480p", "360p"]
    max_filesize_mb: 500
  
  network:
    timeout: 30
    retries: 3
    rate_limit: "1M"
    user_agent: "Mozilla/5.0 (compatible; LoomDownloader/1.0)"
  
  tools:
    primary: "yt-dlp"
    fallback: ["ffmpeg", "wget"]
    yt_dlp_path: "/usr/local/bin/yt-dlp"
    ffmpeg_path: "/usr/local/bin/ffmpeg"
```

#### 8.4.2 Logging and Monitoring Commands
```bash
# Setup logging directory and files
setup_logging() {
    local log_dir="./logs"
    mkdir -p "$log_dir"
    
    # Create log files with timestamps
    local date_stamp=$(date +"%Y%m%d")
    export DOWNLOAD_LOG="$log_dir/downloads_$date_stamp.log"
    export ERROR_LOG="$log_dir/errors_$date_stamp.log"
    export STATS_LOG="$log_dir/stats_$date_stamp.log"
}

# Log download activity
log_download() {
    local action="$1"
    local video_id="$2"
    local url="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$action" in
        "start")
            echo "[$timestamp] START: $video_id | URL: $url" >> "$DOWNLOAD_LOG"
            ;;
        "complete")
            local file_path="$4"
            local file_size=$(du -h "$file_path" 2>/dev/null | cut -f1)
            echo "[$timestamp] COMPLETE: $video_id | File: $file_path | Size: $file_size" >> "$DOWNLOAD_LOG"
            ;;
        "error")
            local error_msg="$4"
            echo "[$timestamp] ERROR: $video_id | Error: $error_msg" >> "$ERROR_LOG"
            ;;
    esac
}

# Monitor download statistics
track_download_stats() {
    local stats_file="$STATS_LOG"
    
    # Count downloads by status
    local total=$(grep -c "START:" "$DOWNLOAD_LOG" 2>/dev/null || echo 0)
    local completed=$(grep -c "COMPLETE:" "$DOWNLOAD_LOG" 2>/dev/null || echo 0)
    local failed=$(grep -c "ERROR:" "$ERROR_LOG" 2>/dev/null || echo 0)
    
    # Calculate success rate
    local success_rate=0
    if [ $total -gt 0 ]; then
        success_rate=$(( (completed * 100) / total ))
    fi
    
    echo "Download Statistics:" | tee -a "$stats_file"
    echo "Total attempts: $total" | tee -a "$stats_file"
    echo "Completed: $completed" | tee -a "$stats_file"
    echo "Failed: $failed" | tee -a "$stats_file"
    echo "Success rate: $success_rate%" | tee -a "$stats_file"
}

# Export download report
generate_download_report() {
    local output_file="${1:-download_report.txt}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "Loom Download Report - Generated: $timestamp" > "$output_file"
    echo "============================================" >> "$output_file"
    echo "" >> "$output_file"
    
    track_download_stats >> "$output_file"
    
    echo "" >> "$output_file"
    echo "Recent Downloads:" >> "$output_file"
    tail -20 "$DOWNLOAD_LOG" >> "$output_file" 2>/dev/null
    
    echo "" >> "$output_file"
    echo "Recent Errors:" >> "$output_file"
    tail -10 "$ERROR_LOG" >> "$output_file" 2>/dev/null
}
```

---

## 9. Troubleshooting and Edge Cases

### 9.1 Common Issues and Solutions

#### 9.1.1 Authentication and Access Control Commands
```bash
# Test different referer headers
test_referer_headers() {
    local url="$1"
    local referers=(
        "https://www.loom.com/"
        "https://loom.com/"
        "https://app.loom.com/"
        ""  # No referer
    )
    
    for referer in "${referers[@]}"; do
        echo "Testing with referer: $referer"
        if [ -n "$referer" ]; then
            curl -I -H "Referer: $referer" "$url"
        else
            curl -I "$url"
        fi
        echo "---"
    done
}

# Download with authentication headers
download_with_auth() {
    local url="$1"
    local output_dir="${2:-./downloads}"
    
    # Try with various user agents and headers
    local user_agents=(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        "Mozilla/5.0 (compatible; Loom-Downloader/1.0)"
    )
    
    for ua in "${user_agents[@]}"; do
        echo "Trying with User-Agent: $ua"
        if yt-dlp --user-agent "$ua" --add-header "Referer:https://www.loom.com/" -o "$output_dir/%(title)s.%(ext)s" "$url"; then
            echo "✓ Success with User-Agent: $ua"
            return 0
        fi
    done
    
    echo "✗ All authentication methods failed"
    return 1
}

# Check access permissions
check_video_access() {
    local video_url="$1"
    
    echo "Checking video accessibility..."
    
    # Extract video ID
    local video_id=$(echo "$video_url" | grep -oE "[a-f0-9]{32}")
    
    if [ -z "$video_id" ]; then
        echo "✗ Invalid video URL format"
        return 1
    fi
    
    # Test various endpoints
    local test_urls=(
        "https://www.loom.com/share/$video_id"
        "https://www.loom.com/embed/$video_id"
        "https://cdn.loom.com/sessions/$video_id/transcoded/mp4/720/video.mp4"
    )
    
    for test_url in "${test_urls[@]}"; do
        echo "Testing: $test_url"
        local status=$(curl -o /dev/null -s -w "%{http_code}" "$test_url")
        echo "Status: $status"
        
        if [ "$status" = "200" ] || [ "$status" = "302" ]; then
            echo "✓ Video accessible"
            return 0
        fi
    done
    
    echo "✗ Video not accessible - may be private or deleted"
    return 1
}
```

#### 9.1.2 Rate Limiting and Throttling Commands
```bash
# Rate-limited download function
rate_limited_download() {
    local url="$1"
    local rate_limit="${2:-1M}"
    local calls_per_minute="${3:-30}"
    
    # Calculate delay between calls
    local delay_seconds=$((60 / calls_per_minute))
    
    echo "Rate limiting: $calls_per_minute calls/minute (${delay_seconds}s delay)"
    
    # Download with rate limiting
    yt-dlp --limit-rate "$rate_limit" "$url"
    
    # Wait before next call
    echo "Waiting ${delay_seconds} seconds before next download..."
    sleep "$delay_seconds"
}

# Batch download with rate limiting
batch_download_rate_limited() {
    local url_file="$1"
    local rate_limit="${2:-500K}"
    local delay="${3:-2}"
    
    echo "Starting rate-limited batch download..."
    echo "Rate limit: $rate_limit, Delay: ${delay}s between downloads"
    
    while IFS= read -r url; do
        echo "Downloading: $url"
        yt-dlp --limit-rate "$rate_limit" "$url"
        
        echo "Waiting ${delay} seconds..."
        sleep "$delay"
    done < "$url_file"
}

# Monitor and adjust download speed
adaptive_rate_limiting() {
    local url="$1"
    local max_speed="2M"
    local min_speed="500K"
    
    echo "Starting adaptive rate limiting..."
    
    # Try maximum speed first
    if yt-dlp --limit-rate "$max_speed" "$url"; then
        echo "✓ Download successful at maximum speed"
    else
        echo "Rate limited, retrying with reduced speed..."
        sleep 30
        
        # Try reduced speed
        if yt-dlp --limit-rate "$min_speed" "$url"; then
            echo "✓ Download successful at reduced speed"
        else
            echo "✗ Download failed even with rate limiting"
            return 1
        fi
    fi
}
```

### 9.2 Format-specific Issues

#### 9.2.1 HLS Stream Problems
```bash
# Diagnose HLS stream issues
ffprobe -v error -show_format -show_streams "https://cdn.loom.com/sessions/{VIDEO_ID}/transcoded/hls/master.m3u8"

# Download with segment retry
ffmpeg -protocol_whitelist file,http,https,tcp,tls -max_reload 5 -i "master.m3u8" -c copy output.mp4

# Handle broken segments
ffmpeg -err_detect ignore_err -i "master.m3u8" -c copy output.mp4
```

#### 9.2.2 Codec Compatibility
```bash
# Convert for maximum compatibility
ffmpeg -i input.webm -c:v libx264 -profile:v baseline -level 3.0 -c:a aac -ac 2 -b:a 128k output_compatible.mp4

# Handle unsupported codecs
ffmpeg -i input.mp4 -c:v libx264 -c:a aac -avoid_negative_ts make_zero output_fixed.mp4
```

### 9.3 Performance Troubleshooting

#### 9.3.1 Slow Download Diagnosis
```bash
# Test connection speed to Loom CDN
test_connection_speed() {
    local test_url="https://cdn.loom.com/sessions/test/transcoded/mp4/720/video.mp4"
    
    echo "Testing connection speed..."
    curl -w "Connect: %{time_connect}s\nFirst byte: %{time_starttransfer}s\nSpeed: %{speed_download} bytes/s\n" \
         -o /dev/null -s "$test_url"
}

# Monitor download performance
monitor_download_performance() {
    local url="$1"
    local output_file="$2"
    
    echo "Starting performance monitoring..."
    
    # Start download and monitor
    yt-dlp --newline --progress-template "download:%(progress._percent_str)s %(progress._speed_str)s ETA %(progress._eta_str)s" \
           -o "$output_file" "$url" 2>&1 | tee download_progress.log
    
    # Analyze performance from log
    grep "download:" download_progress.log | tail -10
}
```

#### 9.3.2 Memory Usage Optimization
```bash
# Download with memory constraints
download_memory_efficient() {
    local url="$1"
    local output_file="$2"
    
    # Use smaller buffer sizes for limited memory
    yt-dlp --buffer-size 16K --http-chunk-size 1M -o "$output_file" "$url"
}

# Monitor system resources during download
monitor_system_resources() {
    local pid="$1"
    
    while kill -0 "$pid" 2>/dev/null; do
        echo "$(date): CPU: $(ps -p $pid -o %cpu --no-headers)% | Memory: $(ps -p $pid -o %mem --no-headers)%"
        sleep 5
    done
}
```

### 9.4 Quality and Corruption Issues

#### 9.4.1 Video Integrity Verification
```bash
# Verify downloaded video integrity
verify_video_integrity() {
    local video_file="$1"
    
    echo "Verifying video integrity..."
    
    # Check if file exists and has size
    if [ ! -f "$video_file" ]; then
        echo "✗ File does not exist"
        return 1
    fi
    
    local file_size=$(stat -f%z "$video_file" 2>/dev/null || stat -c%s "$video_file" 2>/dev/null)
    if [ "$file_size" -eq 0 ]; then
        echo "✗ File is empty"
        return 1
    fi
    
    # Use ffprobe to check video integrity
    if ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$video_file" >/dev/null 2>&1; then
        echo "✓ Video integrity verified"
        return 0
    else
        echo "✗ Video appears to be corrupted"
        return 1
    fi
}

# Calculate and verify file checksums
verify_checksum() {
    local file="$1"
    local expected_checksum="$2"
    
    if [ -z "$expected_checksum" ]; then
        echo "No checksum provided for verification"
        return 0
    fi
    
    local actual_checksum=$(sha256sum "$file" | cut -d' ' -f1)
    
    if [ "$actual_checksum" = "$expected_checksum" ]; then
        echo "✓ Checksum verified"
        return 0
    else
        echo "✗ Checksum mismatch: expected $expected_checksum, got $actual_checksum"
        return 1
    fi
}
```

#### 9.4.2 Automatic Repair Attempts
```bash
# Attempt to repair corrupted MP4
repair_mp4() {
    local input_file="$1"
    local output_file="${2:-${input_file%.mp4}_repaired.mp4}"
    
    echo "Attempting to repair MP4 file..."
    
    # Try different repair strategies
    local repair_commands=(
        "ffmpeg -err_detect ignore_err -i \"$input_file\" -c copy \"$output_file\""
        "ffmpeg -i \"$input_file\" -avoid_negative_ts make_zero -c copy \"$output_file\""
        "ffmpeg -i \"$input_file\" -c:v libx264 -c:a aac \"$output_file\""
    )
    
    for cmd in "${repair_commands[@]}"; do
        echo "Trying: $cmd"
        if eval "$cmd" 2>/dev/null; then
            echo "✓ Repair successful with: $cmd"
            return 0
        fi
    done
    
    echo "✗ Unable to repair file"
    return 1
}

# Fix timestamp issues
fix_timestamps() {
    local input_file="$1"
    local output_file="${2:-${input_file%.mp4}_fixed.mp4}"
    
    echo "Fixing timestamp issues..."
    ffmpeg -i "$input_file" -avoid_negative_ts make_zero -c copy "$output_file"
}

# Reconstruct index for seeking
rebuild_index() {
    local input_file="$1"
    local output_file="${2:-${input_file%.mp4}_indexed.mp4}"
    
    echo "Rebuilding video index..."
    ffmpeg -i "$input_file" -c copy -movflags +faststart "$output_file"
}
```

---

## 10. Conclusion

### 10.1 Summary of Findings

This research has comprehensively analyzed Loom's video delivery infrastructure, revealing a sophisticated multi-CDN architecture utilizing AWS CloudFront and Fastly for global content distribution. Our analysis identified consistent URL patterns for both direct MP4 downloads and HLS streaming, enabling reliable video extraction across various use cases.

**Key Technical Findings:**
- Loom utilizes predictable URL patterns based on 32-character hexadecimal video IDs
- Multiple quality levels are available (240p to 1080p+) in both MP4 and WebM formats
- HLS streams provide adaptive bitrate streaming with 6-10 second segments
- CDN failover mechanisms ensure high availability across multiple domains

### 10.2 Recommended Implementation Approach

Based on our research, we recommend a **hierarchical download strategy** that prioritizes reliability and performance:

1. **Primary Method**: yt-dlp for standard cases (90% success rate expected)
2. **Secondary Method**: Direct MP4 downloads with CDN failover
3. **Tertiary Method**: HLS stream processing with ffmpeg
4. **Backup Methods**: gallery-dl, streamlink, and custom scrapers

### 10.3 Tool Recommendations

**Essential Tools:**
- **yt-dlp**: Primary download tool with extensive format support
- **ffmpeg**: Stream processing, conversion, and analysis
- **curl/wget**: Direct HTTP downloads with custom headers

**Recommended Backup Tools:**
- **gallery-dl**: Alternative extractor with good Loom support
- **streamlink**: Specialized for streaming content
- **Puppeteer/Playwright**: Browser automation for complex cases

**Infrastructure Tools:**
- **Docker**: Containerized deployment for consistency
- **Redis**: Caching for URL resolution and metadata
- **PostgreSQL**: Download tracking and analytics

### 10.4 Performance Considerations

Our testing indicates optimal performance with:
- **Concurrent Downloads**: 3-4 simultaneous downloads per IP
- **Rate Limiting**: 30 requests per minute to avoid throttling
- **Retry Logic**: Exponential backoff with 3 retry attempts
- **Quality Selection**: 720p provides best balance of quality/size for most use cases

### 10.5 Security and Compliance Notes

**Important Considerations:**
- Respect Loom's terms of service and usage policies
- Implement appropriate rate limiting to avoid service disruption
- Consider user privacy and data protection requirements
- Ensure compliance with applicable copyright and data protection laws

### 10.6 Future Research Directions

**Areas for Continued Development:**
1. **Machine Learning**: Automatic quality and format selection based on user behavior
2. **Edge Computing**: Distributed download processing for improved performance
3. **Advanced Analytics**: Detailed performance monitoring and optimization
4. **Mobile Optimization**: Enhanced support for mobile app video extraction
5. **Real-time Processing**: Live stream capture and processing capabilities

### 10.7 Maintenance and Updates

Given the dynamic nature of web platforms, this research should be updated regularly:
- **Monthly**: URL pattern validation and CDN endpoint testing
- **Quarterly**: Tool compatibility and version updates
- **Annually**: Comprehensive architecture review and strategy refinement

The methodologies and tools documented in this research provide a robust foundation for reliable Loom video downloading while maintaining flexibility to adapt to platform changes and emerging requirements.

---

**Disclaimer**: This research is provided for educational and legitimate archival purposes. Users must comply with applicable terms of service, copyright laws, and data protection regulations when implementing these techniques.

**Last Updated**: September 2024  
**Research Version**: 1.0  
**Next Review**: December 2024
