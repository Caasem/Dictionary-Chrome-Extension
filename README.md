# arabic-dict-chrome-firefox-anki

*Please note the following was generated with the help of AI. I don't really know how to code - but it (mostly) works!*

Arabic Dictionary Chrome/Firefox extension based on open-source dictionary data with Anki Connect integration.

Just hover your cursor over an Arabic word and the translation pops up! Click to save definitions, create Anki flashcards, and build your vocabulary.

https://github.com/user-attachments/assets/0e92c0e8-8852-433c-b5ec-3ee0529edd4d

## Recommended Anki Workflow
1. **Hover** over an Arabic word → see definitions instantly
2. **Press a number key** (1-9) to copy a specific definition, or **left-click** to copy all definitions
3. **Highlight** the sentence containing the word
4. **Press `Ctrl + Space`** for quick save (skips the panel when both fields are ready) or click the + button
5. **Done!** Card saves to your last used Anki deck (or queues automatically if Anki is closed)

Need to edit? Press `Ctrl + Shift + B` to open the full editing panel first.

## ✨ What's New (2026 Update)

I somehow managed, with DeepSeek AI's help, to add a bunch of new features. Most of them even work!

### Anki Integration
- **Offline queue system** - Cards save locally when Anki isn't running, auto-sync when available (works most of the time!)
- **Smart shortcuts**:
  - `Ctrl + Space` - Quick save (when both fields ready)
  - `Ctrl + Shift + B` - Open editing panel
  - `Ctrl + Shift + Q` - Force queue (bypasses Anki check)
- **Floating + icon** - Appears after highlighting text (click to save)
- **Fallback button** - Appears when the + icon can't (for tricky websites)
- **Remembers your last used deck** - Set it once and forget it

### Core Improvements
- **Copy individual definitions** - Press 1-9 to copy specific meanings
- **Copy all definitions** - Click any word to copy everything at once

### Performance
- **Caching system** - Frequently looked-up words load instantly
- **Chunked DOM processing** - Pages with hundreds of words no longer freeze
- **Debounced events** - Smoother scrolling, less CPU usage
- **Smaller memory footprint** - Cache limits prevent leaks
- **Popup cleanup** - Frees memory when tooltips close
- I have no idea if that makes it better or worse ^^
  
## What You'll Notice

| Before | After |
|--------|-------|
| No copy options | **Click to copy all, numbers for individual** |
| No Anki support | **Full Anki integration with offline queue** |
| Page lag on load | **Smooth, no freezing** |
| Slow on repeat hovers | **Instant from cache** |
| Technical formatting | **Clean, readable definitions** |
| Firefox issues | **Actually works in Firefox now** |
| Fixed popup size | **Adjustable font, width, height** |
| Light mode only | **Dark mode support** |

## Screenshots

*Insert your screenshots here*

## Installation

Arabic Dictionary is available for download via the Chrome Web Store. Alternatively, if you wish to tinker around with the code:

Chrome:

Download the source
Open Chrome and go to chrome://extensions/
Enable "Developer mode" (toggle in top-right)
Click "Load unpacked"
Select the src folder

Firefox:

Download the source
Open Firefox and go to about:debugging
Click "This Firefox" on the left sidebar
Click "Load Temporary Add-on"
Navigate to the src folder and select the manifest.json file

## 🔧 How It Works

### Word Lookup
The translation files are from the Linguistic Data Consortium (GPLv2) and are stored in `src/data` as plain text. When a page loads, each word is quickly decomposed into prefix + stem + suffix using compatibility tables. Arabic words can have multiple decompositions, which is why you sometimes see several definitions for one word.

### Display
All Arabic words on the page are wrapped in spans with hover tooltips showing definitions. Click or use number keys to copy.

### Anki Integration
The extension talks to Anki-Connect (a separate add-on you install in Anki). When Anki isn't running, cards queue up and sync automatically when it opens.

## ⚠️ Known Issues
- The offline queue works... until it doesn't (refresh often helps)
- Floating + icon sometimes appears far from your highlight
- Some websites (Gmail, Google Docs) don't play nice with the + icon
- Duplicate cards? Anki blocks them by default (we're working on an option)

## Wishlist
- [ ] Actually fix the queue system so it's not "dodgy"
- [ ] Option to allow duplicate cards
- [ ] Word history tracking
- [ ] Multiple card templates
- [ ] Audio pronunciation
- [ ] Shared community decks
- [ ] Better website compatibility

## Credits
- Dictionary data: Linguistic Data Consortium (GPLv2)
- Anki-Connect: Foosoft
- Endless patience: DeepSeek AI (who wrote most of this while I asked questions)

*If something breaks... well, that's what issue reports are for!*
