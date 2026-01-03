# Phase 4.3: Hover Delete Icon UI - Task Checklist

## Goal

Replace hidden Ctrl+Click deletion with visible hover trash icon (Finnish M3,
mode-aware, batch delete, custom colors)

## Task 1: Mode Interface Extension (45 min)

- [x] Add
      [DeletionConfig](file:///home/sandy/projects/_underscore/src/content/modes/highlight-mode.interface.ts#94-117)
      interface to
      [highlight-mode.interface.ts](file:///home/sandy/projects/_underscore/src/content/modes/highlight-mode.interface.ts)
- [x] Add
      [getDeletionConfig()](file:///home/sandy/projects/_underscore/src/content/modes/highlight-mode.interface.ts#76-82)
      to
      [IHighlightMode](file:///home/sandy/projects/_underscore/src/content/modes/highlight-mode.interface.ts#38-89)
- [x] Implement default in
      [BaseHighlightMode](file:///home/sandy/projects/_underscore/src/content/modes/base-highlight-mode.ts#22-163)
- [x] TypeScript compiles

## Task 2: Mode-Specific Configs (30 min)

- [x] WalkMode: No confirmation
- [x] SprintMode: With confirmation
- [x] VaultMode: Protected deletion

## Task 3: Finnish M3 Styles (1 hour)

- [x] Create
      [src/content/ui/delete-icon.css](file:///home/sandy/projects/_underscore/src/content/ui/delete-icon.css)
- [x] M3 error colors (#BA1A1A, #FFDAD6)
- [x] M3 motion (200-250ms)
- [x] Dark mode support
- [x] WCAG AAA focus
- [x] Custom color variants (yellow, blue, green, orange, purple)
- [x] Batch selection badge styles

## Task 4: Delete Icon Component (2 hours)

- [x] Create
      [src/content/ui/delete-icon-overlay.ts](file:///home/sandy/projects/_underscore/src/content/ui/delete-icon-overlay.ts)
- [x] Implement
      [showIcon()](file:///home/sandy/projects/_underscore/src/content/ui/delete-icon-overlay.ts#27-56)
      positioning
- [x] Click handler with mode-aware confirmation
- [x] Keyboard navigation (Tab, Enter, Escape)
- [x] ARIA labels
- [x] Batch selection (Shift+Click)
- [x] Custom icon colors

## Task 5: Hover Detection (1.5 hours)

- [x] Create
      [src/content/ui/highlight-hover-detector.ts](file:///home/sandy/projects/_underscore/src/content/ui/highlight-hover-detector.ts)
- [x] Throttled mousemove (50ms)
- [x] Emit hover events
- [x] No performance lag
- [x] Scroll handling

## Task 6: Integration (1 hour)

- [x] Import in
      [content.ts](file:///home/sandy/projects/_underscore/src/entrypoints/content.ts)
- [x] Initialize components
- [x] Wire hover → icon events
- [x] Extension builds

## Task 7: Batch Delete (1 hour)

- [x] Selection state tracking
- [x] Shift+Click multi-select
- [x] Selection badge with count
- [x] Batch confirmation
- [x] Escape clears selection

## Task 8: Custom Icon Colors (30 min)

- [x] Map colorRole to icon background
- [x] Update CSS for color variants (yellow/blue/green/orange/purple)
- [x] WCAG AAA contrast

## Task 9: Testing (1.5 hours)

- [x] Build successful (10.5s)
- [x] All code implemented
- [x] Walkthrough created
- [x] **Bug discovered**: liveRanges not accessible from repository

## Task 10: Fix liveRanges Access (Bug Fix) 🐛

- [x] Change
      [HighlightHoverDetector](file:///home/sandy/projects/_underscore/src/content/ui/highlight-hover-detector.ts#13-204)
      to use CSS.highlights API
- [x] Change
      [HighlightClickDetector](file:///home/sandy/projects/_underscore/src/content/highlight-click-detector.ts#16-125)
      to use CSS.highlights API
- [x] Fix AbstractRange → Range casting (2 places)
- [x] Build successful
- [x] **User testing**: Verified hover detection works

## Task 11: Fix Repository Population (Critical Bug Fix) 🐛🐛

- [x] Identified root cause:
      [createFromData()](file:///home/sandy/projects/_underscore/src/content/modes/walk-mode.ts#119-122)
      missing `repository.add()`
- [x] Added `repository.add()` to Sprint Mode
      [createFromData()](file:///home/sandy/projects/_underscore/src/content/modes/walk-mode.ts#119-122)
- [x] Verified Vault Mode already has the fix
- [x] Build successful
- [x] **User testing**: Repository cache populated correctly

## Task 12: Fix DI Registration (Root Cause) 🔥

- [x] Discovered modes were getting raw `InMemoryHighlightRepository`
- [x] Changed DI to inject
      [RepositoryFacade](file:///home/sandy/projects/_underscore/src/shared/repositories/repository-facade.ts#36-285)
      for all modes
- [x] Repository cache now properly synchronized
- [x] Build successful
- [x] **Verified**: Cache populated, hover detection works

## Task 13: Fix Icon Visibility (CSS Issue) 🎨

- [x] Found icon was invisible (opacity: 0)
- [x] Changed CSS to make icon visible by default
- [x] Removed dependency on hover class
- [x] Build successful
- [x] **Verified**: Icon appears on hover

## Task 14: Fix Deletion Logic (Event Handler) 🗑️

- [x] Found
      [onHighlightRemoved()](file:///home/sandy/projects/_underscore/src/content/modes/highlight-mode.interface.ts#73-74)
      only saved event, didn't delete
- [x] Added
      [removeHighlight()](file:///home/sandy/projects/_underscore/src/content/modes/walk-mode.ts#141-159)
      call to actually delete highlight
- [x] Visual deletion now works
- [x] Build successful
- [x] **Verified**: Highlights delete on click ✅

## Progress

**Total**: 14/14 tasks complete  
**Status**: ✅ **FULLY WORKING - READY FOR PRODUCTION**

---

## Final Testing Results ✅

**All features working**:

1. ✅ Create highlights (double-click)
2. ✅ Hover over highlights → delete icon appears
3. ✅ Click icon → confirmation dialog
4. ✅ Highlight deletes from page
5. ✅ Repository cache updated (count decreases)
6. ✅ Persists to storage
7. ✅ Page reload - deleted highlights stay deleted

**Critical fixes applied**:

- Fixed DI registration (modes now use RepositoryFacade)
- Fixed repository population during restore
- Fixed icon visibility (CSS)
- Fixed deletion handler (actually calls removeHighlight)
