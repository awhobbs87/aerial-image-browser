# Apple Liquid Glass Sidebar Redesign Specification

## Executive Summary

This specification outlines a complete redesign of the sidebar interface to match macOS Sonoma's "Apple Liquid Glass" aesthetic. The redesign maintains all existing functionality while introducing translucent layers, frosted blur effects, depth layering, and Apple's signature minimal chrome.

---

## 1. Visual Hierarchy & Structure

### 1.1 Overall Layout

```
┌─────────────────────────────────────┐
│  SIDEBAR CONTAINER                   │
│  ┌─────────────────────────────────┐ │
│  │ Advanced Filters (Accordion)     │ │ ← Translucent header
│  └─────────────────────────────────┘ │
│  ──────────────────────────────────── │ ← Hairline separator
│  ┌─────────────────────────────────┐ │
│  │ Compare Module                   │ │ ← Frosted glass card
│  │ ┌──────────┐  ┌──────────┐     │ │
│  │ │ Compare  │  │Then vs Now│    │ │
│  │ └──────────┘  └──────────┘     │ │
│  └─────────────────────────────────┘ │
│  ──────────────────────────────────── │ ← Hairline separator
│  ┌─────────────────────────────────┐ │
│  │ View Mode Selector               │ │ ← Segmented control
│  │ [Grid] [Map] [Timeline] [Gallery]│ │
│  └─────────────────────────────────┘ │
│  ──────────────────────────────────── │ ← Hairline separator
│  ┌─────────────────────────────────┐ │
│  │ Quick Filters                    │ │ ← Capsule chips
│  │ [Historical] [Modern] [High Detail]│ │
│  └─────────────────────────────────┘ │
│  ──────────────────────────────────── │ ← Hairline separator
│  ┌─────────────────────────────────┐ │
│  │ Sort/Group Controls             │ │ ← Minimal controls
│  └─────────────────────────────────┘ │
│  ═══════════════════════════════════ │ ← Content divider (subtle)
│  ┌─────────────────────────────────┐ │
│  │ GALLERY CONTENT AREA            │ │ ← Primary focus
│  │                                 │ │
│  │ 2024                            │ │ ← Bold year headers
│  │ ┌──┐ ┌──┐ ┌──┐ ┌──┐            │ │
│  │ │  │ │  │ │  │ │  │            │ │ ← Floating photo cards
│  │ └──┘ └──┘ └──┘ └──┘            │ │
│  │                                 │ │
│  │ 2023                            │ │
│  │ ┌──┐ ┌──┐ ┌──┐                 │ │
│  │ │  │ │  │ │  │                 │ │
│  │ └──┘ └──┘ └──┘                 │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 1.2 Spacing Rhythm

- **Module spacing**: 24px vertical between major sections
- **Internal padding**: 16px horizontal, 12px vertical within modules
- **Content area padding**: 20px top, 16px sides
- **Photo card gap**: 12px (reduced from 16px)
- **Year header margin**: 20px top, 12px bottom

---

## 2. Apple Liquid Glass Components

### 2.1 Sidebar Container

**Background:**
- Light mode: `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(20px)`
- Dark mode: `rgba(28, 28, 30, 0.85)` with `backdrop-filter: blur(20px)`
- Subtle vertical gradient: `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.85) 100%)` (light)
- Border: Hairline `rgba(0, 0, 0, 0.06)` (light) / `rgba(255, 255, 255, 0.08)` (dark)

**Elevation:**
- Soft inner shadow: `inset 0 1px 0 rgba(255, 255, 255, 0.5)` (light)
- Soft inner shadow: `inset 0 1px 0 rgba(255, 255, 255, 0.1)` (dark)

### 2.2 Advanced Filters Accordion

**Header:**
- Background: Translucent `rgba(255, 255, 255, 0.6)` (light) / `rgba(42, 42, 42, 0.6)` (dark)
- Border radius: 10px
- Padding: 12px 16px
- Typography: SF Pro style, 15px, weight 600
- Icon: 18px, primary color with 0.8 opacity

**Content:**
- Background: `rgba(255, 255, 255, 0.4)` (light) / `rgba(42, 42, 42, 0.4)` (dark)
- Border radius: 0 0 10px 10px
- Padding: 16px

**Active indicator chip:**
- Translucent background: `rgba(5, 150, 105, 0.15)` (light) / `rgba(16, 185, 129, 0.2)` (dark)
- Border: 1px solid `rgba(5, 150, 105, 0.3)`
- Typography: 11px, weight 600, uppercase

### 2.3 Compare Module

**Container:**
- Background: Frosted glass `rgba(255, 255, 255, 0.7)` (light) / `rgba(42, 42, 42, 0.7)` (dark)
- Backdrop filter: `blur(30px) saturate(180%)`
- Border: 1px solid `rgba(0, 0, 0, 0.05)` (light) / `rgba(255, 255, 255, 0.1)` (dark)
- Border radius: 12px
- Padding: 20px
- Box shadow: `0 4px 16px rgba(0, 0, 0, 0.08)` (light) / `0 4px 16px rgba(0, 0, 0, 0.4)` (dark)
- Inner shadow: `inset 0 1px 0 rgba(255, 255, 255, 0.6)` (light) / `inset 0 1px 0 rgba(255, 255, 255, 0.15)` (dark)

**Title:**
- Typography: 13px, weight 600, letter-spacing 0.01em
- Color: `rgba(0, 0, 0, 0.85)` (light) / `rgba(255, 255, 255, 0.9)` (dark)
- Margin bottom: 12px

**Hint text:**
- Typography: 12px, weight 400
- Color: `rgba(0, 0, 0, 0.5)` (light) / `rgba(255, 255, 255, 0.6)` (dark)
- Margin bottom: 16px

**Buttons:**
- Background (active): `rgba(5, 150, 105, 0.15)` (light) / `rgba(16, 185, 129, 0.25)` (dark)
- Background (inactive): `rgba(0, 0, 0, 0.04)` (light) / `rgba(255, 255, 255, 0.08)` (dark)
- Border: 1px solid `rgba(5, 150, 105, 0.3)` (active) / `rgba(0, 0, 0, 0.08)` (inactive)
- Border radius: 8px
- Padding: 10px 16px
- Typography: 13px, weight 500
- Hover: Background lightens 10%, subtle scale `transform: scale(1.02)`
- Disabled: Opacity 0.35, no interaction

### 2.4 View Mode Selector (Segmented Control)

**Container:**
- Background: `rgba(0, 0, 0, 0.04)` (light) / `rgba(255, 255, 255, 0.08)` (dark)
- Border: 1px solid `rgba(0, 0, 0, 0.06)` (light) / `rgba(255, 255, 255, 0.1)` (dark)
- Border radius: 10px
- Padding: 4px
- Backdrop filter: `blur(10px)`

**Segments:**
- Background (default): Transparent
- Background (selected): `rgba(255, 255, 255, 0.9)` (light) / `rgba(60, 60, 60, 0.9)` (dark)
- Border radius: 8px
- Padding: 8px 14px
- Typography: 13px, weight 500
- Color (default): `rgba(0, 0, 0, 0.6)` (light) / `rgba(255, 255, 255, 0.7)` (dark)
- Color (selected): `rgba(0, 0, 0, 0.9)` (light) / `rgba(255, 255, 255, 0.95)` (dark)
- Box shadow (selected): `0 2px 8px rgba(0, 0, 0, 0.1)` (light) / `0 2px 8px rgba(0, 0, 0, 0.3)` (dark)
- Transition: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`

### 2.5 Quick Filters (Capsule Chips)

**Container:**
- Margin: 0 0 24px 0

**Label:**
- Typography: 11px, weight 600, uppercase, letter-spacing 0.05em
- Color: `rgba(0, 0, 0, 0.5)` (light) / `rgba(255, 255, 255, 0.6)` (dark)
- Margin: 0 0 10px 0

**Chips:**
- Background: `rgba(255, 255, 255, 0.6)` (light) / `rgba(60, 60, 60, 0.6)` (dark)
- Border: 1px solid `rgba(0, 0, 0, 0.1)` (light) / `rgba(255, 255, 255, 0.15)` (dark)
- Border radius: 20px (capsule)
- Padding: 6px 14px
- Typography: 12px, weight 500
- Backdrop filter: `blur(10px)`
- Hover: Background `rgba(5, 150, 105, 0.1)` (light) / `rgba(16, 185, 129, 0.15)` (dark)
- Active: Background `rgba(5, 150, 105, 0.15)` (light) / `rgba(16, 185, 129, 0.2)` (dark)
- Icon: 14px, margin-right 6px

### 2.6 Sort/Group Controls

**Container:**
- Background: Transparent
- Spacing: 16px gap between controls

**Label:**
- Typography: 11px, weight 600, uppercase
- Color: `rgba(0, 0, 0, 0.5)` (light) / `rgba(255, 255, 255, 0.6)` (dark)
- Margin: 0 0 8px 0

**Toggle buttons:**
- Background: `rgba(0, 0, 0, 0.03)` (light) / `rgba(255, 255, 255, 0.06)` (dark)
- Border: 1px solid `rgba(0, 0, 0, 0.08)` (light) / `rgba(255, 255, 255, 0.1)` (dark)
- Border radius: 8px
- Padding: 6px 12px
- Typography: 12px, weight 500
- Selected: Background `rgba(5, 150, 105, 0.1)` (light) / `rgba(16, 185, 129, 0.15)` (dark)

### 2.7 Content Divider

**Separator:**
- Height: 1px
- Background: `linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.08) 20%, rgba(0, 0, 0, 0.08) 80%, transparent 100%)` (light)
- Background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0.1) 80%, transparent 100%)` (dark)
- Margin: 32px 0 24px 0

### 2.8 Gallery Content Area

**Year Headers:**
- Typography: 20px, weight 700, letter-spacing -0.01em
- Color: `rgba(0, 0, 0, 0.9)` (light) / `rgba(255, 255, 255, 0.95)` (dark)
- Margin: 20px 0 12px 0
- No background, no border

**Photo Cards:**
- Background: `rgba(255, 255, 255, 0.95)` (light) / `rgba(42, 42, 42, 0.95)` (dark)
- Border: 1px solid `rgba(0, 0, 0, 0.06)` (light) / `rgba(255, 255, 255, 0.1)` (dark)
- Border radius: 8px (reduced from 12px)
- Box shadow: `0 2px 8px rgba(0, 0, 0, 0.06)` (light) / `0 2px 8px rgba(0, 0, 0, 0.3)` (dark)
- Hover: 
  - Transform: `translateY(-2px)`
  - Box shadow: `0 4px 12px rgba(0, 0, 0, 0.1)` (light) / `0 4px 12px rgba(0, 0, 0, 0.4)` (dark)
- Transition: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`

---

## 3. Typography System

### 3.1 Font Stack
- Primary: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif`
- Fallback: `Inter, system-ui, sans-serif`

### 3.2 Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| Year Header | 20px | 700 | 1.2 | -0.01em |
| Module Title | 15px | 600 | 1.3 | 0.01em |
| Body Text | 13px | 400 | 1.5 | 0 |
| Hint Text | 12px | 400 | 1.4 | 0 |
| Label (Uppercase) | 11px | 600 | 1.4 | 0.05em |
| Button Text | 13px | 500 | 1.4 | 0.02em |
| Chip Text | 12px | 500 | 1.4 | 0 |

### 3.3 Color Contrast

- **Primary text**: WCAG AA compliant (4.5:1 minimum)
- **Secondary text**: WCAG AA compliant (4.5:1 minimum)
- **Disabled states**: 35% opacity minimum

---

## 4. Interaction States

### 4.1 Hover States
- Subtle background lightening (10-15% increase in opacity)
- Gentle scale transform: `scale(1.02)` for buttons, `translateY(-2px)` for cards
- Smooth transitions: `0.2s cubic-bezier(0.4, 0, 0.2, 1)`

### 4.2 Active States
- Background: 20% increase in opacity
- Border: Slight color intensification
- Scale: `scale(0.98)` for tactile feedback

### 4.3 Focus States
- Outline: 2px solid primary color
- Outline offset: 2px
- Border radius: Matches element radius

### 4.4 Disabled States
- Opacity: 0.35
- Cursor: `not-allowed`
- No hover effects

---

## 5. Depth & Layering

### 5.1 Z-Index Hierarchy
- Sidebar container: `z-index: 100`
- Floating modules: `z-index: 101`
- Active elements: `z-index: 102`
- Tooltips: `z-index: 1000`

### 5.2 Shadow System

**Light Mode:**
- Subtle: `0 1px 3px rgba(0, 0, 0, 0.06)`
- Medium: `0 4px 12px rgba(0, 0, 0, 0.08)`
- Elevated: `0 8px 24px rgba(0, 0, 0, 0.12)`

**Dark Mode:**
- Subtle: `0 1px 3px rgba(0, 0, 0, 0.3)`
- Medium: `0 4px 12px rgba(0, 0, 0, 0.4)`
- Elevated: `0 8px 24px rgba(0, 0, 0, 0.5)`

### 5.3 Inner Highlights
- Light mode: `inset 0 1px 0 rgba(255, 255, 255, 0.5-0.6)`
- Dark mode: `inset 0 1px 0 rgba(255, 255, 255, 0.1-0.15)`

---

## 6. Responsive Behavior

### 6.1 Desktop (≥960px)
- Full sidebar width: 480px
- All modules visible
- Spacing: Full specification values

### 6.2 Tablet (600px - 959px)
- Sidebar width: 400px
- Reduced padding: 14px horizontal
- Tighter spacing: 20px between modules

### 6.3 Mobile (<600px)
- Sidebar: Full width
- Modules stack vertically
- Reduced padding: 12px horizontal
- Spacing: 16px between modules

---

## 7. Animation & Transitions

### 7.1 Timing Functions
- Standard: `cubic-bezier(0.4, 0, 0.2, 1)`
- Enter: `cubic-bezier(0.0, 0, 0.2, 1)`
- Exit: `cubic-bezier(0.4, 0, 1, 1)`

### 7.2 Durations
- Micro: 150ms (hover states)
- Standard: 200ms (transitions)
- Complex: 300ms (transforms)

### 7.3 Transitions
- All interactive elements: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- Background changes: `background-color 0.2s ease`
- Transforms: `transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)`

---

## 8. Accessibility

### 8.1 Keyboard Navigation
- Tab order: Logical flow through all interactive elements
- Focus indicators: 2px solid outline, 2px offset
- Skip links: Available for screen readers

### 8.2 Screen Reader Support
- ARIA labels on all interactive elements
- ARIA expanded states for accordions
- ARIA selected states for toggles
- Descriptive button text

### 8.3 Color Contrast
- All text meets WCAG AA standards (4.5:1)
- Interactive elements have sufficient contrast
- Disabled states maintain visibility

---

## 9. Implementation Notes

### 9.1 Backdrop Filter Support
- Use `@supports (backdrop-filter: blur(20px))` for progressive enhancement
- Fallback: Solid backgrounds with reduced opacity
- Test on Safari, Chrome, Firefox

### 9.2 Performance
- Use `will-change: transform` sparingly (only on animated elements)
- Debounce scroll events
- Lazy load gallery images
- Optimize backdrop-filter usage (limit blur radius)

### 9.3 Browser Compatibility
- Safari 14+: Full support
- Chrome 76+: Full support
- Firefox 103+: Full support
- Edge 79+: Full support

---

## 10. Design Rationale

### 10.1 Hierarchy
The redesign establishes clear visual hierarchy through:
- **Translucency levels**: More important elements have higher opacity
- **Blur intensity**: Primary modules use stronger blur (30px) vs secondary (10px)
- **Spacing rhythm**: Generous whitespace creates breathing room
- **Typography weight**: Bold year headers draw attention to content

### 10.2 Depth
Layering is achieved through:
- **Frosted glass effect**: Creates separation between layers
- **Subtle shadows**: Low-elevation shadows suggest depth without heaviness
- **Inner highlights**: Mimics light reflection on glass surfaces
- **Gradient overlays**: Barely perceptible vertical gradients add dimension

### 10.3 Balance
Visual balance is maintained by:
- **Consistent spacing**: 24px rhythm creates predictable structure
- **Reduced visual weight**: Translucent backgrounds prevent overwhelming the gallery
- **Content-first approach**: Controls recede, content advances
- **Minimal chrome**: Only essential UI elements, no decorative flourishes

### 10.4 Translucency Strategy
- **Sidebar base**: 85% opacity allows map to show through subtly
- **Modules**: 60-70% opacity creates clear grouping
- **Active elements**: 90-95% opacity ensures readability
- **Backdrop blur**: 20-30px creates frosted glass effect without performance impact

---

## 11. Quality Checklist

- [ ] All modules use translucent backgrounds with backdrop-filter
- [ ] Hairline separators (1px) between major sections
- [ ] Compare module has frosted glass treatment with inner shadow
- [ ] View mode selector matches macOS segmented control style
- [ ] Quick filters use capsule shape (border-radius: 20px)
- [ ] Year headers are bold and prominent
- [ ] Photo cards have reduced border radius (8px) and soft shadows
- [ ] Spacing follows 24px rhythm between modules
- [ ] All text meets WCAG AA contrast requirements
- [ ] Hover states use subtle transforms and opacity changes
- [ ] Focus indicators are visible and accessible
- [ ] Transitions use Apple's timing functions
- [ ] Backdrop-filter has fallback for unsupported browsers

---

## 12. Future Enhancements

- **Dynamic blur**: Adjust blur intensity based on scroll position
- **Color tinting**: Subtle color overlays based on selected photos
- **Micro-interactions**: Gentle bounce on selection, smooth page transitions
- **Adaptive spacing**: Adjust spacing based on content density
- **Smart grouping**: Visual grouping of related controls

---

*Document Version: 1.0*  
*Last Updated: 2025-01-27*  
*Design System: Apple Liquid Glass (macOS Sonoma)*

