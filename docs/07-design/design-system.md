# Design System
**Web Highlighter Extension - Visual Design**

---

## Color Palette

### Primary Highlight Colors (5 Presets)

#### 1. Sunshine Yellow (Default)
```css
--highlight-yellow: #FFEB3B;
--highlight-yellow-rgb: 255, 235, 59;
--highlight-yellow-contrast: #000000;
```
**Use**: General highlighting, most visible  
**Accessibility**: AAA contrast ratio  
**Psychology**: Attention, energy, optimism

---

#### 2. Ocean Blue
```css
--highlight-blue: #64B5F6;
--highlight-blue-rgb: 100, 181, 246;
--highlight-blue-contrast: #000000;
```
**Use**: Technical content, facts  
**Accessibility**: AAA contrast ratio  
**Psychology**: Trust, calm, intelligence

---

#### 3. Forest Green
```css
--highlight-green: #81C784;
--highlight-green-rgb: 129, 199, 132;
--highlight-green-contrast: #000000;
```
**Use**: Positive points, agreements  
**Accessibility**: AAA contrast ratio  
**Psychology**: Growth, harmony, balance

---

#### 4. Sunset Orange
```css
--highlight-orange: #FFB74D;
--highlight-orange-rgb: 255, 183, 77;
--highlight-orange-contrast: #000000;
```
**Use**: Important warnings, key points  
**Accessibility**: AAA contrast ratio  
**Psychology**: Enthusiasm, creativity, attention

---

#### 5. Lavender Purple
```css
--highlight-purple: #BA68C8;
--highlight-purple-rgb: 186, 104, 200;
--highlight-purple-contrast: #FFFFFF;
```
**Use**: Quotes, inspirational content  
**Accessibility**: AAA contrast ratio  
**Psychology**: Wisdom, creativity, luxury

---

## UI Colors

### Extension Chrome

```css
/* Background */
--surface-primary: #FFFFFF;
--surface-secondary: #F5F5F5;
--surface-tertiary: #E0E0E0;

/* Text */
--text-primary: #212121;
--text-secondary: #757575;
--text-disabled: #BDBDBD;

/* Borders */
--border-light: #E0E0E0;
--border-medium: #BDBDBD;
--border-dark: #9E9E9E;

/* Interactive */
--interactive-hover: #F5F5F5;
--interactive-active: #E0E0E0;
--interactive-focus: #2196F3;

/* Status */
--status-success: #4CAF50;
--status-warning: #FF9800;
--status-error: #F44336;
--status-info: #2196F3;
```

---

## Typography

### Font Stack
```css
--font-family-sans: system-ui, -apple-system, BlinkMacSystemFont, 
                    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

--font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', 
                    'Courier New', monospace;
```

### Font Sizes
```css
--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-md: 14px;
--font-size-lg: 16px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
```

### Font Weights
```css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Line Heights
```css
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

---

## Spacing Scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

---

## Highlight Styles

### Default Highlight
```css
.highlight {
  background-color: var(--highlight-color);
  color: var(--highlight-contrast);
  padding: 2px 0;
  border-radius: 2px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.highlight:hover {
  opacity: 0.8;
  box-shadow: 0 0 0 2px var(--highlight-color);
}
```

### Highlight States
```css
.highlight--selected {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.highlight--removing {
  animation: fadeOut 0.3s ease-out forwards;
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

---

## Popup UI Design

### Layout
```
┌─────────────────────────┐
│ ⚡ Underscore           │
│    [Sprint Mode]        │
├─────────────────────────┤
│                         │
│         42              │
│      Highlights         │
│                         │
├─────────────────────────┤
│  🟡 🔵 🟢 🟠 🟣        │
│  Color Presets          │
├─────────────────────────┤
│  [ Clear All ]          │
│                         │
│  ⌨️  Ctrl+U  Highlight  │
│  ⌨️  Ctrl+⇧+U Clear All │
│                         │
└─────────────────────────┘
```

### Dimensions
```css
--popup-width: 320px;
--popup-min-height: 400px;
--popup-padding: 16px;
```

---

## Settings Page Design (Future)

### Layout
```
┌──────────────────────────────────────┐
│  ⚡ Underscore Highlighter           │
│  ─────────────────────────────────  │
│                                      │
│  Settings                            │
│                                      │
│  🎨 Appearance                       │
│   ├─ Highlight Opacity: [━━━●─]    │
│   ├─ Border Radius: [●━━━━━]       │
│   └─ Animation Speed: [━●━━━━]     │
│                                      │
│  ⚡ Sprint Mode                       │
│   ├─ ☑ Enable double-tap           │
│   └─ ☑ Show tooltips               │
│                                      │
│  ⌨️  Keyboard Shortcuts              │
│   ├─ Highlight: [Ctrl+U]           │
│   ├─ Remove: [Click]               │
│   └─ Clear All: [Ctrl+Shift+U]    │
│                                      │
│  [ Save Changes ]                   │
│                                      │
└──────────────────────────────────────┘
```

---

## Animations

### Micro-interactions
```css
/* Highlight creation */
@keyframes highlightCreated {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Highlight removal */
@keyframes highlightRemoved {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* Button hover */
@keyframes buttonHover {
  transition: all 0.2s ease;
}

/* Tooltip */
@keyframes tooltipAppear {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Accessibility

### WCAG AA Compliance
- ✅ Color contrast ratio ≥ 4.5:1
- ✅ Focus indicators visible
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Reduced motion support

### Focus Styles
```css
*:focus-visible {
  outline: 2px solid var(--interactive-focus);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Dark Mode (Future)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --surface-primary: #1E1E1E;
    --surface-secondary: #252525;
    --surface-tertiary: #2C2C2C;
    
    --text-primary: #E0E0E0;
    --text-secondary: #A0A0A0;
    
    /* Adjust highlight colors for dark backgrounds */
    --highlight-yellow: #FDD835;  /* Darker yellow */
    --highlight-blue: #42A5F5;    /* Darker blue */
    --highlight-green: #66BB6A;   /* Darker green */
    --highlight-orange: #FFA726;  /* Darker orange */
    --highlight-purple: #AB47BC;  /* Darker purple */
  }
}
```

---

## Icons (Lucide)

We'll use Lucide Icons (lightweight, consistent):
- ⚡ Highlight: `zap`
- 🎨 Color: `palette`
- ⌨️ Keyboard: `keyboard`
- ⚙️ Settings: `settings`
- 🗑️ Delete: `trash-2`
- ✖️ Clear: `x`
- ✓ Success: `check`

---

## Component Library

### Button
```css
.btn {
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: 6px;
  font-family: var(--font-family-sans);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--interactive-focus);
  color: white;
}

.btn-secondary {
  background: var(--surface-secondary);
  color: var(--text-primary);
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

### Color Picker
```css
.color-picker {
  display: flex;
  gap: var(--space-2);
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option--selected {
  border-color: var(--interactive-focus);
  transform: scale(1.15);
}
```

---

**Export as CSS Variables**: `src/shared/styles/design-tokens.css`

**Last Updated**: 2025-12-27  
**Design Version**: 1.0
