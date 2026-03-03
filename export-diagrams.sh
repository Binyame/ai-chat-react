#!/bin/bash

# Export Mermaid diagrams to images for LinkedIn
# Requires: mermaid-cli (mmdc)

echo "📊 Exporting Mermaid Diagrams for LinkedIn"
echo ""

# Check if mermaid-cli is installed
if ! command -v mmdc &> /dev/null; then
    echo "❌ mermaid-cli not found. Installing..."
    echo "Run: npm install -g @mermaid-js/mermaid-cli"
    echo ""
    echo "Or use the online editor: https://mermaid.live/"
    exit 1
fi

# Create output directory
mkdir -p linkedin-visuals/images

echo "🔄 Processing diagrams..."

# Process each markdown file with Mermaid diagrams
for file in linkedin-visuals/*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .md)

        # Extract mermaid blocks and create temporary file
        awk '/```mermaid/,/```/' "$file" | sed '/```/d' > "/tmp/${filename}.mmd"

        # Check if mermaid content was found
        if [ -s "/tmp/${filename}.mmd" ]; then
            echo "  📄 $filename..."

            # Export to PNG (LinkedIn optimized: 1200x800)
            mmdc -i "/tmp/${filename}.mmd" \
                 -o "linkedin-visuals/images/${filename}.png" \
                 -w 1200 \
                 -H 800 \
                 -b transparent \
                 2>/dev/null

            if [ $? -eq 0 ]; then
                echo "  ✅ Created linkedin-visuals/images/${filename}.png"
            else
                echo "  ⚠️  Failed to create ${filename}.png"
            fi
        fi
    fi
done

echo ""
echo "✨ Done! Images saved to: linkedin-visuals/images/"
echo ""
echo "📱 LinkedIn Image Guidelines:"
echo "   - Format: PNG (better quality)"
echo "   - Recommended: 1200x628px or 1200x800px"
echo "   - Max file size: 5MB"
echo "   - Use white or transparent background"
echo ""
echo "🎨 Optional: Add branding"
echo "   - Your name/logo in corner"
echo "   - Website URL at bottom"
echo "   - Use Canva or Figma for quick edits"
