#!/bin/bash
# Script to organize documentation files
# Run this from z:\home\sandy\projects\underscore

echo "Creating documentation directory structure..."

# Create directory structure
mkdir -p docs/01-analysis
mkdir -p docs/02-architecture
mkdir -p docs/03-implementation
mkdir -p docs/04-technical

echo "Copying documentation files..."

# Copy files from artifacts to organized docs
cp "/mnt/c/Users/sande/.gemini/antigravity/brain/d41b354f-9a59-47c4-aa3c-0ce49b2634da/architecture_analysis.md" \
   "docs/01-analysis/architecture_analysis.md"

cp "/mnt/c/Users/sande/.gemini/antigravity/brain/d41b354f-9a59-47c4-aa3c-0ce49b2634da/revised_architecture.md" \
   "docs/02-architecture/revised_architecture.md"

cp "/mnt/c/Users/sande/.gemini/antigravity/brain/d41b354f-9a59-47c4-aa3c-0ce49b2634da/revised_architecture_part2.md" \
   "docs/02-architecture/revised_architecture_part2.md"

cp "/mnt/c/Users/sande/.gemini/antigravity/brain/d41b354f-9a59-47c4-aa3c-0ce49b2634da/architecture_decisions_summary.md" \
   "docs/02-architecture/architecture_decisions_summary.md"

cp "/mnt/c/Users/sande/.gemini/antigravity/brain/d41b354f-9a59-47c4-aa3c-0ce49b2634da/sprint_mode_implementation_plan.md" \
   "docs/03-implementation/sprint_mode_implementation_plan.md"

cp "/mnt/c/Users/sande/.gemini/antigravity/brain/d41b354f-9a59-47c4-aa3c-0ce49b2634da/technical_qa.md" \
   "docs/04-technical/technical_qa.md"

echo "✅ Documentation organized successfully!"
echo ""
echo "Directory structure:"
tree docs -L 2

echo ""
echo "Total files: $(find docs -type f | wc -l)"
