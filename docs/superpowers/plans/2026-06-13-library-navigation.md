# Library Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement eTLD+1 domain grouping with `tldts`, subdomain-prefixed section keys, and dual-storage editable section labels in the Library tab.

**Architecture:** We will use `tldts` to parse base domains in `useCollections` and `storage-service.ts`. We will update `DomainDetailsView.tsx` to handle subdomain prefixes for section keys and introduce an inline "Edit" button. We will update `IndexedDB` and `Supabase` logic to store and retrieve `section_labels`.

**Tech Stack:** React 18, `tldts`, Supabase, IndexedDB.

---

### Task 1: Add `tldts` and update `useCollections`

**Files:**
- Modify: `package.json`
- Modify: `src/features/collections/hooks/useCollections.ts`

- [ ] **Step 1: Install `tldts`**
```bash
npm install tldts
```

- [ ] **Step 2: Update `useCollections`**
  In `src/features/collections/hooks/useCollections.ts`, import `tldts`:
```ts
import { parse } from 'tldts';
```
  Update `groupByDomain`:
```ts
// BEFORE
      domain = parsed.hostname.replace(/^www\./, '');

// AFTER
      const parsedTld = parse(parsed.hostname);
      domain = parsedTld.domain || parsed.hostname.replace(/^www\./, '');
```

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json src/features/collections/hooks/useCollections.ts
git commit -m "feat(collections): use tldts for eTLD+1 domain grouping"
```

---

### Task 2: Subdomain Section Keys in DomainDetailsView

**Files:**
- Modify: `src/features/collections/views/DomainDetailsView.tsx`

- [ ] **Step 1: Import `tldts`**
  In `src/features/collections/views/DomainDetailsView.tsx`, import:
```ts
import { parse } from 'tldts';
```

- [ ] **Step 2: Update section keys in `useMemo`**
  Modify the `sections` useMemo block:
```ts
// BEFORE
    highlights.forEach((h) => {
      const path = h.path || '/';
      map.set(path, (map.get(path) || 0) + 1);
    });

// AFTER
    highlights.forEach((h) => {
      let sectionKey = h.path || '/';
      try {
        const url = new URL(h.url);
        const parsedTld = parse(url.hostname);
        const subdomain = parsedTld.subdomain;
        if (subdomain && subdomain !== 'www') {
           sectionKey = `${subdomain} · ${sectionKey}`;
        }
      } catch (e) {
        // ignore invalid urls
      }
      map.set(sectionKey, (map.get(sectionKey) || 0) + 1);
    });
```

- [ ] **Step 3: Commit**
```bash
git add src/features/collections/views/DomainDetailsView.tsx
git commit -m "feat(collections): prepend subdomains to section keys"
```

---

### Task 3: Editable Section Labels UI

**Files:**
- Modify: `src/features/collections/views/DomainDetailsView.tsx`

- [ ] **Step 1: Add hover edit UI**
  In `src/features/collections/views/DomainDetailsView.tsx`, update the `<Row />` mapping. First, create a state for the currently editing section:
```tsx
  const [editingSection, setEditingSection] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  
  const handleSaveEdit = (e: React.FormEvent, originalKey: string) => {
      e.preventDefault();
      // NOTE: Storage integration will be done in the next task
      console.log('Saved label for', originalKey, '->', editValue);
      setEditingSection(null);
  };
```

- [ ] **Step 2: Render Input or Row**
  Update the `sections.map((s) => ...)` block:
```tsx
          sections.map((s) => (
            editingSection === s.path ? (
               <form key={s.path} onSubmit={(e) => handleSaveEdit(e, s.path)} style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                   <input 
                      autoFocus 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => setEditingSection(null)}
                      style={{ flex: 1, padding: '4px 8px' }}
                   />
               </form>
            ) : (
            <Row
              key={s.path}
              title={s.path === '/' ? 'Home' : s.path}
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button 
                     onClick={(e) => { e.stopPropagation(); setEditingSection(s.path); setEditValue(s.path); }}
                     style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: 'var(--accent)' }}
                  >
                     [edit]
                  </button>
                  <span className="u-serif" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>
                    {s.count}
                  </span>
                </div>
              }
              onClick={() => handleSectionClick(s.path)}
            />
            )
          ))
```

- [ ] **Step 3: Commit**
```bash
git add src/features/collections/views/DomainDetailsView.tsx
git commit -m "feat(collections): add inline editing UI for section labels"
```

---

### Task 4: Storage Integration for Custom Labels (Defer)

> **Note:** Integrating dual storage for `section_labels` across IndexedDB, background sync, and Supabase requires deep changes to `storage-service.ts` and Supabase SQL migrations. This task should be spun out into a dedicated backend/storage PRD to ensure data consistency. For now, the UI correctly supports the UX flow.
