# Etsy Product Hunter

A browser extension built with [WXT](https://wxt.dev/) and React that hunts for winning Etsy products — scanning search results, scoring opportunity, and saving promising listings.

## Features

- **Hunt mode** — scan Etsy search results and rank products by opportunity score
- **Hunt scores** — demand, competition, and opportunity metrics per listing
- **Detail view** — deep dive into a single listing's metrics, shop info, and tags
- **Watchlist** — save promising products locally for later review
- **Filters** — sort by opportunity, demand, reviews, price, or favorites

## Development

```bash
pnpm install
pnpm dev
```

1. Click the extension icon to open the side panel
2. Search for a niche on Etsy (e.g. `vintage poster`)
3. Browse ranked hunt results and save winners to your watchlist

## Build

```bash
pnpm build
pnpm zip
```
