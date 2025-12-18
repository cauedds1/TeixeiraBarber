# Design Guidelines: Barbershop Management SaaS Platform

## Design Approach

**Selected Approach:** Design System-based with Material Design foundation, enhanced with Linear's typography clarity and Notion's organizational patterns.

**Rationale:** This is a data-intensive business application requiring consistent, professional UI patterns optimized for efficiency and clarity across multiple user roles (Owner, Barber, Client).

**Key Principles:**
- Clarity over decoration - information density without overwhelming users
- Role-based interface optimization - different panels for different users
- Mobile-first responsiveness - barbershops operate on phones/tablets
- Scannable data presentation - quick access to critical information

## Typography System

**Font Families:**
- Primary: Inter (body text, UI elements, data)
- Display: Cal Sans or Poppins (headings, hero sections)

**Hierarchy:**
- Hero/Display: text-5xl to text-6xl, font-bold
- Section Headers: text-3xl to text-4xl, font-semibold
- Card Titles: text-xl, font-semibold
- Body Text: text-base, font-normal
- Labels/Metadata: text-sm, font-medium
- Captions: text-xs, font-normal

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Tight spacing: p-2, gap-2 (within components)
- Standard spacing: p-4, gap-4 (cards, sections)
- Generous spacing: p-8, gap-8 (page sections)
- Section padding: py-12 to py-20

**Container System:**
- Dashboard pages: max-w-7xl with px-4 to px-8
- Forms/modals: max-w-2xl
- Full-width calendars: w-full with inner max-w-7xl

**Grid Patterns:**
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Statistics: grid-cols-2 md:grid-cols-4
- Calendar views: Flexible full-width grids

## Core Components

**Navigation:**
- Sidebar navigation for Owner/Barber dashboards (fixed left, ~260px)
- Top navigation bar for Client portal (horizontal, mobile-friendly)
- Role-based menu items with icons
- Collapsed mobile navigation (hamburger menu)

**Dashboard Cards:**
- Elevated cards with subtle borders (border rounded-lg)
- Padding: p-6
- Header with icon + title + optional action button
- Content area with clear data hierarchy
- Footer with secondary actions or metadata

**Calendar Components:**
- Day/Week/Month view toggle
- Time slots: clear grid with 30-minute intervals
- Appointment blocks: distinct cards within time slots
- Color coding by service type or barbershop status
- Drag-and-drop indicators (visual only, no animations)

**Data Tables:**
- Sticky header row
- Alternating row subtle treatment
- Sortable columns with clear indicators
- Action buttons aligned right
- Responsive: stack columns on mobile

**Forms:**
- Single-column layout (max-w-2xl)
- Clear label hierarchy above inputs
- Helper text below inputs (text-sm)
- Error states with inline messages
- Grouped related fields with subtle dividers
- Action buttons: primary right-aligned, secondary left

**Client Portal:**
- Hero section with booking CTA (80vh, background image of barbershop)
- Service selection grid (cards with images, 3-column on desktop)
- Barbershop selection with profile photos
- Calendar picker: prominent, mobile-optimized
- Confirmation screen: summary card with all details

**Barber Panel:**
- Today's schedule: list view with time + client + service
- Client cards: photo + name + service + time + phone
- Quick actions: check-in, reschedule, cancel
- Compact mobile view: swipeable cards

**Owner Dashboard:**
- Stats row at top: 4 metric cards (revenue, appointments, occupancy, new clients)
- Charts section: 2-column layout for financial/performance graphs
- Tables below: recent activity, top barbershops, upcoming appointments
- Sidebar filters for date ranges

**Modals/Overlays:**
- Centered modal: max-w-lg to max-w-2xl
- Backdrop blur
- Header with title + close button
- Scrollable content area
- Sticky footer with actions

## Visual Treatments

**Elevation:**
- Flat design with minimal shadows
- Border-based separation preferred
- Subtle shadow for floating elements (modals, dropdowns)

**Buttons:**
- Primary: px-6 py-3, rounded-lg, font-medium
- Secondary: outlined style
- Icon buttons: square, p-2
- Buttons on images: backdrop-blur-sm, semi-transparent background

**Icons:**
- Heroicons via CDN (outline for navigation, solid for actions)
- Consistent 20px or 24px sizing
- Paired with labels in navigation

**Status Indicators:**
- Badges for appointment status (confirmed, pending, completed)
- Dot indicators for availability
- Progress bars for package credits

**Images:**
- Client photos: rounded-full, 40px to 48px
- Service images: rounded-lg, 16:9 aspect ratio
- Hero images: full-bleed with gradient overlay for text contrast
- Before/after gallery: side-by-side grid

## Animations

Minimal animations for business efficiency:
- Page transitions: none
- Hover states: subtle opacity/border changes only
- Loading states: simple spinner or skeleton screens
- NO scroll-triggered animations
- NO decorative animations

## Responsive Breakpoints

- Mobile: base (320px+)
- Tablet: md: (768px+) - 2-column layouts
- Desktop: lg: (1024px+) - 3-column layouts, sidebar visible
- Large: xl: (1280px+) - max-width containers

## Special Sections

**Multi-Tenant Customization:**
- Each barbershop can set their own accent theme (system manages this)
- Logo placement: top-left of navigation
- Barbershop name prominent in header

**Mode Support:**
- Design system supports both light and dark modes
- Default to light mode, toggle available in settings
- Consistent contrast ratios in both modes

This design system prioritizes functionality, speed, and data clarity appropriate for a professional business management tool while maintaining modern aesthetic standards.