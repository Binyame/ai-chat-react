#!/bin/bash

# Create demo GIF from video recording
# Usage: ./create-demo-gif.sh input.mov output.gif

INPUT=$1
OUTPUT=${2:-demo.gif}

if [ -z "$INPUT" ]; then
    echo "Usage: ./create-demo-gif.sh input.mov [output.gif]"
    echo ""
    echo "This script converts your screen recording to an optimized GIF for LinkedIn"
    exit 1
fi

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg not found. Installing..."
    echo "Run: brew install ffmpeg"
    exit 1
fi

echo "🎬 Converting $INPUT to $OUTPUT..."

# Create optimized GIF (good quality, reasonable size)
# - fps=10: 10 frames per second (smooth but not huge)
# - scale=800:-1: Width 800px (good for LinkedIn)
# - split: Better color optimization
ffmpeg -i "$INPUT" \
    -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
    -loop 0 \
    "$OUTPUT"

# Get file size
SIZE=$(du -h "$OUTPUT" | cut -f1)

echo "✅ Done! Created $OUTPUT (${SIZE})"
echo ""
echo "📊 LinkedIn GIF Guidelines:"
echo "   - Max 5MB for best performance"
echo "   - 60-90 seconds recommended"
echo "   - First 3 seconds are auto-played"
echo ""

# Check if file is too large
SIZE_BYTES=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null)
if [ "$SIZE_BYTES" -gt 5242880 ]; then
    echo "⚠️  File is larger than 5MB. Consider:"
    echo "   1. Shorten the video"
    echo "   2. Reduce to 5 fps: ffmpeg -i $INPUT -vf 'fps=5,scale=800:-1:flags=lanczos' $OUTPUT"
    echo "   3. Use MP4 instead: ffmpeg -i $INPUT -vcodec libx264 -crf 28 demo.mp4"
fi
