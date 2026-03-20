# BetterMD

A markdown viewer for macOS. Like Preview, but for `.md` files.

Open any markdown file, view it beautifully rendered or as raw source, edit it in place, and export to PDF. That's it. The simplest md-to-pdf in the west.

## Install

### Homebrew (recommended)

```bash
brew install mylesndavid/tap/bettermd
```

### Manual download

1. Go to [Releases](https://github.com/mylesndavid/bettermd/releases/latest)
2. Download `BetterMD-x.x.x-arm64.dmg`
3. Open the DMG and drag to Applications

### Build from source

```bash
git clone https://github.com/mylesndavid/bettermd.git
cd bettermd
npm install
npm run dist
# DMG will be in release/
```

## Features

**Rendered view** — clean, formatted markdown with syntax-highlighted code blocks and inline images

**Raw view** — see the source, toggle with `Cmd+Shift+R`

**Edit mode** — click Edit or `Cmd+E` to edit the markdown directly, `Cmd+S` to save

**Images** — local and remote images render inline and are included in PDF exports

**Save as PDF** — `Cmd+Shift+E` to export. Uses print-to-PDF under the hood — what you see is what you get

**Dark mode** — follows your system theme, or manually set via View menu (Light / Dark / System)

**Live reload** — edit your file in any editor, BetterMD updates in real-time

**Drag & drop** — drop a `.md` file onto the window or the dock icon

**File associations** — set BetterMD as your default app for `.md` files

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+O` | Open file |
| `Cmd+E` | Toggle edit mode |
| `Cmd+S` | Save |
| `Cmd+Shift+R` | Toggle raw/rendered |
| `Cmd+Shift+E` | Save as PDF |
| `Cmd++` / `Cmd+-` | Zoom in/out |

## Requirements

- macOS (Apple Silicon)

## How it works

Electron app with [marked](https://github.com/markedjs/marked) for markdown parsing and [highlight.js](https://highlightjs.org/) for syntax highlighting. Local images are served via a custom protocol so relative paths like `![](./img.png)` just work. PDF export uses Electron's built-in `printToPDF` — no headless browsers, no LaTeX, no nonsense.

## Tech Stack

- [Electron](https://www.electronjs.org/)
- [marked](https://github.com/markedjs/marked) (markdown parsing)
- [highlight.js](https://highlightjs.org/) (syntax highlighting)
- [esbuild](https://esbuild.github.io/) (bundling)
