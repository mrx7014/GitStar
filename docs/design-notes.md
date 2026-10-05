# GitStar design notes

## Identity
GitStar is a calm developer directory: dark charcoal-navy surfaces, one amber brand/action accent, mint for fresh or successful states, and red only for errors or removed events. The page uses a subtle amber radial glow and no decorative gradients in the UI.

## Tokens and type
Shared values live in `src/styles/tokens.css`. The spacing scale is 4, 8, 12, 16, 24, 32, and 48px. UI text starts at 12px, body copy uses 15px, titles use 17–38px, and metadata uses DM Mono. Inter, Noto Sans Arabic, and DM Mono are self-hosted through Fontsource with `font-display: swap`.

## Layout
Desktop uses a 248px sticky category rail beside a fluid content column. At tablet widths the rail becomes a horizontal category bar; on mobile it becomes a menu drawer and content uses a 14px page gutter. Logical properties and runtime `dir` keep Arabic native. Mobile controls have 44px touch targets and safe-area footer padding.

## Components
The browse page has a compact hero, freshness pill, start-here context, four stat tiles, pure CSS insight bars, filters, and grouped results. Repository rows keep a compact directory rhythm: initial tile, identity, two-line description, topic chips, language dot, stars/forks, and safe external links. Every interactive control has a visible focus ring and an accessible name.

## Motion and accessibility
Hover, focus, drawer, and state transitions use short 140–160ms ease-out motion. `prefers-reduced-motion` disables animation and smooth scrolling. Color is paired with text for freshness and error states. Arabic copy uses the self-hosted Noto Sans Arabic family and keeps repository names readable in LTR isolation.
