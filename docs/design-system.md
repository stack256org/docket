# Design System

## Philosophy

**Ocean Blue.** Clean, professional, and trustworthy. Docket uses a cool blue palette that feels modern and calm — clear skies over deep water. Customers feel confident submitting requests; agents feel focused working in it.

---

## Color System

### The 4 Brand Colors

All 4 colors are defined as CSS custom properties in `app/globals.css`. To change the entire look of the app, change only these 4 lines.

```css
/* app/globals.css */
@theme {
  --color-cream: #BDDDFC;   /* lightest — page backgrounds              */
  --color-sand:  #88BDF2;   /* light    — borders, dividers, muted fills */
  --color-stone: #6A89A7;   /* mid      — secondary text, captions, icons */
  --color-bark:  #384959;   /* darkest  — headings, primary actions, sidebar */
}
```

Use in Tailwind classes: `bg-cream`, `text-bark`, `border-sand`, `text-stone`.

### Color Roles

| Token | Hex | Primary Role |
|-------|-----|-------------|
| `cream` | `#BDDDFC` | Page background, lightest surface, internal note bg |
| `sand` | `#88BDF2` | Card borders, input borders, dividers, muted fills, inactive nav text |
| `stone` | `#6A89A7` | Secondary text, captions, placeholder text, muted icons |
| `bark` | `#384959` | Primary text, headings, primary buttons, sidebar background, active states |

### Surfaces

| Surface | Background | Border | Notes |
|---------|-----------|--------|-------|
| Page | `cream` | — | The base canvas |
| Card | `white` | `sand` (1px) | Pops against cream background |
| Input | `white` | `sand` (1px) | Focus ring: `bark` |
| Sidebar | `bark` | — | Deep navy |
| Internal note | `cream` | `sand` (2px left) | Blue tint note feel |
| Modal overlay | `black/30` | — | No backdrop blur |

### Semantic Colors (Status, Error, Success)

These are separate from the brand palette — they carry universal meaning and must not be overridden with brand colors.

| Semantic | Color | Use |
|----------|-------|-----|
| Error | `red-600` | Destructive actions, validation errors |
| Warning | `amber-600` | In-progress status |
| Info | `sky-600` | Open status |
| Success | `emerald-600` | Closed status (task done) |
| Neutral | `stone` (brand) | Closed ticket badge |

### Accessibility

| Combination | Contrast | Pass |
|-------------|----------|------|
| `bark` (#574A24) on `white` | ~8.1:1 | AAA ✓ |
| `bark` on `cream` (#FAE8B4) | ~5.2:1 | AA ✓ |
| `white` on `bark` | ~8.1:1 | AAA ✓ |
| `stone` on `cream` | ~2.9:1 | Fail for small text ✗ |
| `stone` on `white` | ~3.5:1 | AA large text only |

**Rule:** Never use `stone` for body text or labels. Use it only for captions, timestamps, and helper text (14px+). Always use `bark` for primary text and form labels.

---

## Typography

Font: **Inter** (default from scaffold). Clean, humanist, warm at lower weights.

| Role | Class |
|------|-------|
| Page title | `text-2xl font-semibold text-bark` |
| Section title | `text-lg font-semibold text-bark` |
| Card title | `text-base font-semibold text-bark` |
| Body text | `text-sm text-bark` |
| Secondary / muted | `text-sm text-stone` |
| Caption / timestamp | `text-xs text-stone` |
| Form label | `text-sm font-medium text-bark` |
| Placeholder | `text-stone` (via Tailwind placeholder modifier) |

---

## Buttons

### Primary
```
bg-bark text-white rounded-md px-4 py-2 text-sm font-medium
hover:bg-bark/90  focus-visible:ring-2 ring-bark/50
```

### Secondary / Outline
```
bg-white text-bark border border-sand rounded-md px-4 py-2 text-sm font-medium
hover:bg-cream
```

### Ghost
```
text-stone rounded-md px-4 py-2 text-sm font-medium
hover:bg-cream hover:text-bark
```

### Destructive
```
bg-red-600 text-white  (shadcn default variant="destructive")
```

Loading state: spinner replaces or appears before the label text. Button stays the same size — never resize on loading.

---

## Form Fields

```
┌─────────────────────────────────────────┐
│ Full Name *                             │  ← label: text-sm font-medium text-bark
│ ┌─────────────────────────────────────┐ │
│ │ Enter your full name                │ │  ← input: white bg, sand border
│ └─────────────────────────────────────┘ │
│                                         │
│ Email Address *                         │
│ ┌─────────────────────────────────────┐ │
│ │ jane@example.com                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Description *                           │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │   Describe your issue in detail...  │ │  ← textarea: min-h-[120px]
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ Helper text or error message            │  ← text-xs text-stone (help) or text-red-600 (error)
└─────────────────────────────────────────┘
```

- Input border: `border-sand` → focus: `border-bark ring-1 ring-bark/20`
- Error state: `border-red-400 ring-1 ring-red-400/20`
- Labels always above the field, never floating/placeholder labels
- Required fields: asterisk `*` in `text-bark` (same as label) — not red
- Use shadcn `Form` + react-hook-form for all forms

---

## Border Radius

| Surface | Class |
|---------|-------|
| Cards | `rounded-xl` |
| Modals / Dialogs | `rounded-xl` |
| Popovers / Dropdowns | `rounded-xl` |
| Section containers | `rounded-xl` |
| Buttons | `rounded-md` |
| Inputs / Selects | `rounded-md` |
| Badges | `rounded-full` |
| Avatars | `rounded-full` |

Never leave border radius missing on any container.

---

## Spacing

| Token | Value |
|-------|-------|
| Card padding | `p-6` |
| Section gap | `space-y-6` |
| Form field gap | `space-y-4` |
| Sidebar padding | `px-3 py-4` |
| Nav item padding | `px-3 py-2` |
| Page content padding | `p-6 lg:p-8` |

---

## Status Badges

```
Open        → bg-sky-100 text-sky-700 border border-sky-200
In Progress → bg-amber-100 text-amber-700 border border-amber-200
Closed      → bg-sand/40 text-stone border border-sand
```

Using brand sand/stone for "Closed" integrates it naturally into the warm palette — closed tickets feel "settled" not "alarming."

```tsx
// Badge usage example
<Badge className="bg-sky-100 text-sky-700 border border-sky-200 rounded-full">
  Open
</Badge>
```

---

## Category Badges

All category badges use the same neutral brand style:
```
bg-sand/30 text-stone border border-sand/50 rounded-full text-xs
```

| Category | Label |
|----------|-------|
| `bug` | Bug |
| `issue` | Issue |
| `feature_request` | Feature Request |
| `billing` | Billing |
| `general_query` | General Query |

---

## Icons

Use **Phosphor Icons** (`@phosphor-icons/react`). Always `weight="regular"` unless emphasis is needed (`weight="bold"` for active/selected states).

| Usage | Icon Name |
|-------|-----------|
| Dashboard | `SquaresFourIcon` |
| Ticket | `TicketIcon` |
| Users | `UsersIcon` |
| Internal note | `LockSimpleIcon` |
| Attachment | `PaperclipIcon` |
| Delete | `TrashIcon` |
| Deactivate / reactivate user | `UserMinusIcon` / `UserPlusIcon` |
| Close ticket | `CheckCircleIcon` |
| Reopen ticket | `ArrowCounterClockwiseIcon` |
| Assign agent | `UserPlusIcon` |
| Send reply | `PaperPlaneRightIcon` |
| Search | `MagnifyingGlassIcon` |
| Filter | `FunnelsIcon` |
| Admin shield | `ShieldCheckIcon` |
| Sign out | `SignOutIcon` |
| Settings | `GearIcon` |
| Warning / confirm | `WarningIcon` |
| Info | `InfoIcon` |
| Add / new | `PlusIcon` |
| Close / dismiss | `XIcon` |
| Email | `EnvelopeIcon` |
| Calendar | `CalendarIcon` |
| Clock / time | `ClockIcon` |
| Chevron | `CaretRightIcon` / `CaretDownIcon` |

Icon sizes: `size-4` (16px) inline, `size-5` (20px) nav, `size-6` (24px) standalone/empty states.

---

## Layout Architecture

### Customer Portal

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] Docket         [Find My Tickets]  [Submit]│  ← white header, sand bottom border
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  cream background                       │
│          ┌──────────────────────────────────┐           │
│          │  white card — rounded-xl          │           │
│          │  max-w-2xl mx-auto                │           │
│          │                                   │           │
│          │  [content here]                   │           │
│          │                                   │           │
│          └──────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Background: `cream`
- Header: `white`, bottom border `sand`, max-w-screen, sticky
- Content: `max-w-2xl mx-auto` for forms, `max-w-3xl mx-auto` for lists/detail
- No sidebar

### Agent Portal

```
┌──────────┬──────────────────────────────────────────────┐
│          │ top bar: white, sand bottom border            │
│  SIDEBAR ├──────────────────────────────────────────────┤
│  w-60    │                                              │
│  bg-bark │           cream background                   │
│          │                                              │
│  cream   │        [main content area]                   │
│  logo    │                                              │
│  ──────  │                                              │
│  nav     │                                              │
│  items   │                                              │
│          │                                              │
│  ──────  │                                              │
│  agent   │                                              │
│  profile │                                              │
└──────────┴──────────────────────────────────────────────┘
```

- Sidebar: `bg-bark w-60 min-h-screen flex flex-col`
- Main area: `flex-1 bg-cream`
- Top bar inside main: `bg-white border-b border-sand h-14`

**Page title + description live in the top bar, not in the page.** Every
agent/admin route registers an icon, title, and one-line description in
`ROUTE_META` in `components/agent/topbar.tsx`, keyed by pathname — a route with
no entry renders a blank top bar. So when adding a page under `(agent)` or
`(admin)`, add its `ROUTE_META` entry and **don't** repeat the title as a
page-level `<h1>`. Card/section headings inside the page (`<h2 class="text-base
font-semibold">`) are separate and still expected. Standalone docs pages
(`/admin/api-keys/docs`, `/admin/webhooks/docs`) are the one exception — they
keep their own in-page hero heading as well.

### Ticket Detail (Agent)

```
┌──────────┬────────────────────────────┬─────────────────┐
│          │                            │                 │
│ SIDEBAR  │   THREAD                   │   INFO SIDEBAR  │
│  (nav)   │   (flex-1, min-w-0)        │   w-80          │
│          │                            │                 │
│          │  Subject + badges          │  Status         │
│          │  ─────────────────         │  Category       │
│          │  [customer msg]            │  Assigned       │
│          │  [internal note]           │  ─────────────  │
│          │  [agent reply]             │  Customer info  │
│          │                            │  ─────────────  │
│          │  ─────────────────         │  Dates          │
│          │  [Reply form]              │  ─────────────  │
│          │                            │  [Close Ticket] │
└──────────┴────────────────────────────┴─────────────────┘
```

- Thread: `flex-1 overflow-y-auto`
- Info sidebar: `w-80 border-l border-sand bg-white`
- On mobile: single column, info sidebar becomes a collapsible section below

---

## Sidebar Design (Agent/Admin)

```
┌────────────────────────┐
│                        │  bg-bark (#574A24)
│  ◈  Docket       │  ← logo + name: text-cream font-semibold
│                        │
│  ────────────────────  │  ← divider: sand/20 opacity
│                        │
│  ⊞  Dashboard          │  ← inactive: text-sand, hover: text-cream bg-cream/10
│  ✉  All Tickets        │  ← active: text-cream bg-cream/15 border-l-2 border-sand
│                        │
│  ── Admin only ──      │  ← section label: text-sand/60 text-xs uppercase
│  👥 Users              │
│                        │
│  ────────────────────  │
│                        │
│  ○  Jane Smith         │  ← avatar + name: text-cream text-sm
│     jane@example.com   │  ← email: text-sand text-xs
│     Sign Out           │  ← text-sand text-xs hover:text-cream
└────────────────────────┘
```

**Exact classes:**
- Container: `w-60 bg-bark min-h-screen flex flex-col`
- Logo area: `px-4 py-5 border-b border-sand/20`
- Nav item (inactive): `flex items-center gap-3 px-3 py-2 text-sm text-sand rounded-md hover:bg-cream/10 hover:text-cream transition-colors`
- Nav item (active): `flex items-center gap-3 px-3 py-2 text-sm text-cream bg-cream/15 rounded-md border-l-2 border-sand font-medium`
- Section label: `px-3 pt-4 pb-1 text-xs font-medium text-sand/60 uppercase tracking-wider`
- Bottom agent area: `mt-auto px-3 py-4 border-t border-sand/20`

---

## Ticket Thread Components

### Customer Message
```
┌──────────────────────────────────────────────────┐
│  ○ Jane Smith          Bug  |  2 hours ago       │  ← header row
│                                                  │
│  My login page keeps returning a 500 error       │
│  when I try to sign in with Google. It works     │
│  fine on Firefox but not on Chrome.              │
│                                                  │
│  📎 screenshot.png  (245 KB)                     │  ← attachment chip
└──────────────────────────────────────────────────┘
```
- Card: `bg-white border border-sand rounded-xl p-4`
- Avatar bg: `bg-sand/40 text-bark` (initials)

### Agent Reply
```
┌──────────────────────────────────────────────────┐
│  ● John Smith  [Agent]     1 hour ago             │
│                                                  │
│  Thanks for reaching out! I've reproduced the    │
│  issue. This looks like a session cookie bug.    │
│  I'm escalating it to our backend team.          │
└──────────────────────────────────────────────────┘
```
- Card: `bg-white border border-sand rounded-xl p-4`
- Left accent line: `border-l-2 border-bark` (subtle distinction from customer)
- Agent badge: `bg-sand/30 text-stone text-xs rounded-full px-2`

### Internal Note
```
╔══════════════════════════════════════════════════╗
║  🔒 Internal Note                                ║  ← lock icon + label in stone
║  John Smith  ·  55 minutes ago                   ║
║                                                  ║
║  Customer's account has a duplicate email        ║
║  issue. Flagged to @sarah to check the DB.       ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```
- Card: `bg-cream border-l-4 border-sand rounded-xl p-4`
- Note header: `text-xs font-medium text-stone flex items-center gap-1.5`
- Content: `text-sm text-bark mt-2`
- Visual distinction: cream bg + thicker left border — unmistakable "internal" feel

---

## Reply Form (Agent)

Reply composer is a **Tiptap rich text editor** (`components/common/rich-text-editor.tsx`), not a plain textarea — a formatting toolbar sits above the input. Same component for customer and agent. See the **Rich Text (Replies)** convention in `CLAUDE.md`.

```
┌──────────────────────────────────────────────────┐
│  [Reply] [Internal Note]                         │  ← tab toggle
├──────────────────────────────────────────────────┤
│  B  I  U  S  <>  •≡  1≡  ▢  ❝                    │  ← Tiptap toolbar
├──────────────────────────────────────────────────┤
│                                                  │
│  [   Type your reply...                       ]  │  ← Tiptap editor, min-h-[96px]
│                                                  │
├──────────────────────────────────────────────────┤
│  📎 Attach file          [Send Reply →]          │  ← footer row
└──────────────────────────────────────────────────┘
```
- Container: `border border-sand rounded-xl overflow-hidden`
- Tab bar: `bg-cream border-b border-sand`
- Active tab: `bg-white border-b-2 border-bark text-bark`
- Inactive tab: `text-stone hover:text-bark`
- Footer: `bg-cream px-3 py-2 flex justify-between items-center`

---

## Confirmation Dialogs

Never use `window.confirm()`. Use shadcn `Dialog`.

```
┌─────────────────────────────────┐
│                                 │
│    ┌──────────┐                 │
│    │  🗑  ◉   │   ← icon in rounded-full
│    └──────────┘    bg-red-100 for delete
│                    bg-amber-100 for warning
│                                 │
│    Delete Ticket #1042          │  ← text-lg font-semibold text-bark
│    This will permanently delete │  ← text-sm text-stone
│    all comments and attachments.│
│    This cannot be undone.       │
│                                 │
│  ┌──────────┐  ┌──────────────┐ │
│  │  Cancel  │  │  Delete      │ │  ← Cancel: outline, Delete: destructive
│  └──────────┘  └──────────────┘ │
│                                 │
└─────────────────────────────────┘
```

- Loading state on action button: spinner + text like "Deleting..." — disable both buttons.
- For non-destructive confirms (close ticket): icon in `bg-bark/10`, action button uses primary (bark) not destructive (red).

---

## Dashboard Stat Cards

```
┌──────────────────────────────┐
│  [icon]              254     │  ← number: text-3xl font-bold text-bark
│                              │
│  Total Tickets               │  ← text-sm font-medium text-bark
│  All time                    │  ← text-xs text-stone
└──────────────────────────────┘
```

- Card: `bg-white border border-sand rounded-xl p-6`
- Icon: in a `rounded-lg bg-sand/30` container, `text-bark` color, `size-5`
- Grid: 4 cards in `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`

**Open Tickets card** (special — shows avg wait):
```
┌──────────────────────────────┐
│  [icon]               42     │
│                              │
│  Open Tickets                │
│  Avg. wait: 2h 14m   ← amber │  ← text-xs text-amber-600 font-medium
└──────────────────────────────┘
```

---

## Customer Portal — Landing Page

```
cream background — full viewport height

┌─────────────────────────────────────────────┐
│  ◈ Docket            [Find My Tickets] │  ← white header, sand border
└─────────────────────────────────────────────┘

                    [company logo / icon]

          How can we help you today?             ← text-3xl font-semibold text-bark
     Get support from our team — we'll get       ← text-base text-stone
           back to you as soon as possible.

         ┌──────────────────────────────┐
         │   Submit a Support Ticket    │         ← primary bark button, px-8 py-3
         └──────────────────────────────┘

           Already submitted a ticket?
              Find My Tickets →                  ← text-stone underline hover:text-bark
```

---

## Customer Portal — Submit Form

```
cream background

       Submit a Support Ticket                   ← text-2xl font-semibold text-bark
  Describe your issue and we'll get              ← text-sm text-stone
      back to you as soon as possible.

┌─────────────────────────────────────────────┐
│                                             │  ← white card, rounded-xl, shadow-sm, border-sand
│  Full Name *                                │
│  [                                       ]  │
│                                             │
│  Email Address *                            │
│  [                                       ]  │
│                                             │
│  Subject *                                  │
│  [                                       ]  │
│                                             │
│  Category *                                 │
│  [ Select a category                    ▼]  │
│                                             │
│  Description *                              │
│  [                                       ]  │
│  [                                       ]  │
│  [                                       ]  │
│                                             │
│  Attachments (optional)                     │
│  ┌──────────────────────────────────────┐   │
│  │  📎 Choose files  or drag & drop    │   │  ← dashed border-sand, bg-cream/50
│  └──────────────────────────────────────┘   │
│  JPG, PNG, PDF, ZIP, TXT · Max 10 MB each   │  ← text-xs text-stone
│  Up to 5 files per ticket                   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │          Submit Ticket               │   │  ← bg-bark text-white, full width
│  └──────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Customer Portal — Ticket Detail

```
cream background

← Back to My Tickets    ← text-stone hover:text-bark, CaretLeftIcon

#1042 — Login page broken on Chrome              ← text-2xl font-semibold text-bark
[Bug]  [Open]  · Submitted 2 hours ago           ← badges + text-xs text-stone

─────────────────────────────────────────────────────────────────────

[customer message card]
[agent reply card]
[customer reply card]

─────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────┐
│ Add a reply                                 │  ← white card, rounded-xl, border-sand
│                                             │
│ [                                        ]  │
│ [   Describe any updates or questions... ]  │
│ [                                        ]  │
│                                             │
│ 📎 Attach files (optional)                 │
│                                             │
│ [Cancel]            [Send Reply →]          │  ← outline + primary
└─────────────────────────────────────────────┘

[Close Ticket]                                   ← ghost/outline button, text-stone
```

The "Close Ticket" is understated (not primary) because it's a less common action.

---

## Agent Portal — Ticket List

```
┌──────────────────────────────────────────────────────────────────────┐
│  All Tickets                                      [42 open tickets]  │  ← page header
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [🔍 Search tickets...        ]  [Status ▼]  [Category ▼]  [Agent ▼]│
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  #    Subject                     Category  Status  Assigned │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  1042  Login page broken on…      Bug       Open    Jane S.  │   │  ← hover: bg-cream/60
│  │  1041  Payment not processing     Billing   In Prog Unassign.│   │
│  │  1040  Feature: dark mode         Feature   Open    John S.  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│                       ← 1  2  3  →                                  │  ← pagination
└──────────────────────────────────────────────────────────────────────┘
```

- Table container: `bg-white rounded-xl border border-sand overflow-hidden`
- Table header: `bg-sand/20 text-xs font-medium text-stone uppercase`
- Row hover: `hover:bg-cream/60 cursor-pointer`
- Row border: `border-b border-sand/50`

---

## Agent Portal — Login Page

```
cream background — full viewport height

          center of screen

          ◈  Docket                        ← bark color, text-2xl font-bold

     Sign in to your account                     ← text-xl font-semibold text-bark
  Enter your email to receive a secure           ← text-sm text-stone, max-w-sm
  sign-in link — no password needed.


┌──────────────────────────────────────┐
│       Sign in with Google  G         │  ← outline button, border-sand, text-bark
└──────────────────────────────────────┘

──────────────── or ────────────────

Email address
[                                    ]     ← white input, sand border

┌──────────────────────────────────────┐
│         Send Sign-In Link →          │  ← bg-bark text-white
└──────────────────────────────────────┘
```

- Container: `max-w-sm mx-auto px-6 py-10`
- White card: `bg-white rounded-xl border border-sand shadow-sm p-8`
- Or: no card — form floats on cream background (cleaner look)
- Google button only shown if Google OAuth is configured (`GOOGLE_CLIENT_ID` env is set)

---

## Empty States

Layout: `flex flex-col items-center justify-center text-center py-20 gap-3`

```
          [Icon — size-10 text-sand]

         No open tickets                          ← text-base font-medium text-bark
  All caught up! Open tickets will appear here.  ← text-sm text-stone

         [CTA button if applicable]
```

| Page | Icon | Heading | Subtext |
|------|------|---------|---------|
| Agent ticket list (all) | `TicketIcon` | No tickets yet | Customers can submit tickets at your support portal. |
| Agent ticket list (filtered) | `FunnelsIcon` | No tickets match | Try adjusting your filters. [Clear filters] |
| Dashboard "My Tickets" | `CheckCircleIcon` | All caught up! | No tickets are assigned to you right now. |
| Customer ticket list | `TicketIcon` | No tickets yet | You haven't submitted a ticket yet. [Submit a ticket →] |
| User list | `UsersIcon` | No agents yet | Add a teammate and assign them the agent role. |

---

## Loading States

- **Page load:** Skeleton screens — use `animate-pulse` with `bg-sand/40` skeleton blocks matching the layout shape.
- **Button actions:** Spinner (`CircleNotchIcon weight="bold" className="animate-spin"`) + disabled state.
- **Ticket list:** 5 skeleton rows matching table row height.
- **Ticket detail:** Skeleton for thread area, real sidebar loads first.

---

## Toasts / Notifications

Use shadcn `Sonner` (or `useToast`). Position: bottom-right.

| Event | Style |
|-------|-------|
| Success | `bg-white border-l-4 border-bark text-bark` |
| Error | `bg-white border-l-4 border-red-500 text-red-700` |
| Info | `bg-white border-l-4 border-sand text-stone` |

Keep toast messages short and action-confirming:
- "Reply sent" (not "Your reply was successfully submitted")
- "Ticket closed"
- "Agent assigned"
- "File too large — max 10 MB"

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|-----------|-------|---------|
| Mobile | < 768px | Single column, sidebar → drawer |
| Tablet | 768–1024px | Sidebar + content, info sidebar collapses |
| Desktop | > 1024px | Full 3-column layout |

- Customer submit form: fully usable on 375px width
- Agent ticket table: columns collapse (hide Category, Assigned) on tablet
- Info sidebar: collapsible accordion on mobile/tablet

---

## Shadows

Warm shadows tinted toward the bark palette:
```css
/* Small card shadow */
box-shadow: 0 1px 3px rgba(87, 74, 36, 0.08), 0 1px 2px rgba(87, 74, 36, 0.04);

/* Modal / popover shadow */
box-shadow: 0 10px 40px rgba(87, 74, 36, 0.12);
```

Use sparingly. Most surfaces use borders instead of shadows.

---

## Component Checklist (before shipping any UI)

- [ ] Every card/container has `rounded-xl`
- [ ] Every button/input has `rounded-md`
- [ ] No `window.confirm()` — all confirms use shadcn Dialog
- [ ] No native `<select>`, `<input type="checkbox">`, `<input type="date">`
- [ ] No `stone` text at small size without a white/light background (contrast)
- [ ] Loading state on all submit buttons
- [ ] Empty state on all list views
- [ ] Mobile viewport tested at 375px
- [ ] Internal notes visually distinct from public replies
- [ ] `customerToken` never appears in any agent-facing API response
