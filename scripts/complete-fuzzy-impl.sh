#!/bin/bash
# Script to complete fuzzy matching implementation for Task 1.4

cd /home/sandy/projects/_underscore

# The fuzzy matching code to add after line 462 (after tryPosition method)
cat > /tmp/fuzzy_methods.txt << 'EOF'

  /**
   * Create a Fuzzy selector from a DOM Range
   */
  createFuzzySelector(range: Range): FuzzySelector {
    const text = range.toString();
    const bodyText = document.body.textContent || '';
    const startOffset = this.getAbsoluteOffset(range.startContainer, range.startOffset);
    const textBefore = bodyText.substring(Math.max(0, startOffset - 50), startOffset);
    const textAfter = bodyText.substring(startOffset + text.length, startOffset + text.length + 50);
    return { text, textBefore, textAfter, threshold: 0.8 };
  }

  /**
   * Try to restore using fuzzy text matching
   */
  async tryFuzzyMatch(selector: FuzzySelector): Promise<Range | null> {
    try {
      const bodyText = document.body.textContent || '';
      const matchIndex = this.dmp.match_main(bodyText, selector.text, 0);
      if (matchIndex === -1) return null;
      
      const foundBefore = bodyText.substring(Math.max(0, matchIndex - 50), matchIndex);
      const foundAfter = bodyText.substring(matchIndex + selector.text.length, matchIndex + selector.text.length + 50);
      const beforeSim = this.calculateSimilarity(selector.textBefore, foundBefore);
      const afterSim = this.calculateSimilarity(selector.textAfter, foundAfter);
      const avgSim = (beforeSim + afterSim) / 2;
      
      if (avgSim < selector.threshold) return null;
      return this.createRangeFromOffset(matchIndex, matchIndex + selector.text.length);
    } catch (error) {
      return null;
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1.length || !str2.length) return 0.0;
    const diffs = this.dmp.diff_main(str1, str2);
    this.dmp.diff_cleanupSemantic(diffs);
    const dist = this.dmp.diff_levenshtein(diffs);
    return 1.0 - (dist / Math.max(str1.length, str2.length));
  }
EOF

echo "Fuzzy methods ready in /tmp/fuzzy_methods.txt"
echo "Manual steps:"
echo "1. Add FuzzySelector interface after PositionSelector (line ~43)"
echo "2. Add 'fuzzy: FuzzySelector' to MultiSelector interface"  
echo "3. Add 'private dmp: DiffMatchPatch;' to class"
echo "4. Add 'this.dmp = new DiffMatchPatch();' to constructor"
echo "5. Insert fuzzy methods from /tmp/fuzzy_methods.txt after tryPosition"
echo "6. Update createSelectors() to add: fuzzy: this.createFuzzySelector(range)"
echo "7. Update restore() to add tier 3: const fuzzyRange = await this.tryFuzzyMatch(selector.fuzzy); if (fuzzyRange) return fuzzyRange;"
