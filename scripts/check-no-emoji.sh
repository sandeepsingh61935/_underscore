#!/bin/bash
# Enforce NO EMOJI policy

echo "🔍 Checking for emoji in source code..."

EMOJI_FOUND=$(grep -r "✅\|⚠️\|❌\|🔄\|💡\|📤\|🗑️\|🧹\|🔥\|🎯" src/ --include="*.ts" --include="*.tsx" | wc -l)

if [ "$EMOJI_FOUND" -gt 0 ]; then
    echo "❌ POLICY VIOLATION: Found $EMOJI_FOUND emoji in source code!"
    echo ""
    echo "Files with emoji:"
    grep -r "✅\|⚠️\|❌\|🔄\|💡\|📤\|🗑️\|🧹\|🔥\|🎯" src/ --include="*.ts" --include="*.tsx" -l
    echo ""
    echo "See docs/00-policies/NO-EMOJI-POLICY.md"
    exit 1
fi

echo "✅ No emoji found - policy compliant!"
exit 0
