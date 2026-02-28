#!/bin/bash
# Compress testimonial videos to web-ready size
# Run this AFTER: brew install ffmpeg
# Usage: chmod +x compress-videos.sh && ./compress-videos.sh

INPUT_DIR="public/videos/reviews"
OUTPUT_DIR="public/videos/compressed"

mkdir -p "$OUTPUT_DIR"

echo "🎬 Compressing videos for web..."
echo ""

compress_video() {
  local input="$1"
  local filename=$(basename "$input")
  local name="${filename%.*}"
  local output="$OUTPUT_DIR/${name}-compressed.mp4"

  echo "📦 Processing: $filename"
  local before=$(du -sh "$input" | cut -f1)

  ffmpeg -i "$input" \
    -vcodec libx264 \
    -crf 28 \
    -preset fast \
    -vf "scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease" \
    -acodec aac \
    -b:a 96k \
    -movflags +faststart \
    -y \
    "$output" 2>/dev/null

  local after=$(du -sh "$output" | cut -f1)
  echo "   ✅ $before → $after  →  $output"
  echo ""
}

# Compress only the large files (skip already small ones)
for f in "$INPUT_DIR"/*.mp4 "$INPUT_DIR"/*.MP4 "$INPUT_DIR"/*.mov "$INPUT_DIR"/*.MOV; do
  [ -f "$f" ] || continue
  size_mb=$(du -m "$f" | cut -f1)
  if [ "$size_mb" -gt 5 ]; then
    compress_video "$f"
  else
    echo "⏭️  Skipping $(basename $f) — already small (${size_mb}MB)"
  fi
done

echo ""
echo "✅ Done! Compressed files are in: $OUTPUT_DIR"
echo ""
echo "📋 Next steps:"
echo "   1. Go to https://supabase.com/dashboard → Storage → testimonials bucket"
echo "   2. Delete the old large video files"
echo "   3. Upload the *-compressed.mp4 files from $OUTPUT_DIR"
echo "   4. Keep the SAME filenames (rename before uploading)"
