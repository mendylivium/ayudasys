# AyudaSys interface direction

Use the default DaisyUI light theme without overriding its palette, radius, or font. The application is a staff workspace for census and distribution, not a promotional landing page.

## Plan

- Surfaces: base-100 for work areas, base-200 for the canvas, base-300 for boundaries. Base-content is the text color. Primary is reserved for the distribution entry point; success/warning communicate actual claim state.
- Typography: inherited system sans; 28px page titles, 18px section titles, 14px body and controls, 12px supporting details. Sentence case. No decorative overlines.
- Layout: 248px desktop sidebar, restrained top navigation, centered content up to 1280px, 24-32px section spacing. Mobile drawer and stacked sections.
- Dashboard: current totals, current programs, distribution action, and recent releases. Remove the marketing hero and generic workflow panel. Empty states explain the next available action.
- Census: search and view switch above program/status filters; a clear legend shared by the map and table. Forms separate household information, members, and location; map remains prominent.
- Controls: native DaisyUI buttons, fields, badges, stats, menu, drawer, and table structures. Use semantic color utilities for status. All actions have consistent labels and keyboard focus.

    Navigation | Overview                         [Register household]
               | Households | Residents | Issued stubs | Released
               | Programs (2/3 width)      | Distribution desk (1/3)
               | Recent releases table

## Review against the brief

The previous design kept a promotional hero and stacked card decoration after switching themes. This plan removes those elements and prioritizes the actual barangay workflow. Preserve the user's default-theme preference; quality comes from composition, density, alignment, and readable state labels. Do not fabricate statistics or program activity for screenshots.

Guides read: official saadeghi/daisyui skill (usage, colors and relevant components), and anthropics/skills frontend-design. Copies used for this task are in ignored tmp/skill-daisyui and tmp/skill-frontend.

## Continued UI polish

- Household census uses readable record cards below the medium breakpoint and the table on desktop. Both show the same filtered records and claim statuses.
- Search/status filters have a clear action, explicit no-match guidance, and a loading state while refreshed data is requested. The selected program remains unchanged when clearing search/status.
- Navigation identifies registration, household details and profile pages correctly. Mobile navigation has a native toggle button, close button and Escape support; keyboard users can skip directly to main content.
- Form padding is tighter on phones, and printed-stub previews stack their QR code below household details on narrow screens. The default DaisyUI theme is preserved.
