One ID, Two Representations:

Raw ID (e.g., "abc123-def456") - Primary Identifier ✅ Repository storage:
repository.findById(id) ✅ Internal maps: this.data.get(id),
this.highlights.get(id) ✅ Deduplication: contentHashIndex.get(hash) → returns
raw ID ✅ Public API: createHighlight() returns raw ID ✅ Remove operations:
removeHighlight(id) takes raw ID Prefixed ID (e.g.,
"underscore-abc123-def456") - CSS Selector ✅ CSS.highlights only:
CSS.highlights.set("underscore-{id}", ...) ✅ Purpose:
::highlight(underscore-abc123) CSS pseudo-element ✅ Created by:
getHighlightName(type, id) function ✅ Allows different types: underscore-{id},
highlight-{id}, box-{id}
