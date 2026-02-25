# arabic-dict-chrome-firefox-anki
Arabic Dictionary Chrome/Firefox extension based on open-source dictionary data with Anki Connect integration.

Just hover your cursor over an Arabic word and the translation pops up! Left-click to save the definition to your clipboard.

Anki Workflow:
1. Left-click the word (Saved to your clipboard).
2. Highlight sentence word is found in.
3. Press Ctrl + Space.
4. Saved to Anki!

# Update
I've somehow managed, using DeepSeek AI, to update this extension. I will list the changes that were undertaken soon. The most important apparently, according to the AI himself are: copy-paste options for individual or all definitions, data structure optimisations, caching system, and DOM processing optimisations. Some of these bigger changes are meant to help with CPU and maybe memory usage I think. Admittedly I unfortunately don't know what most of this all means - but the extension (mostly) does at least work!

## Arabic Dictionary in action!
![screenshot-image](https://github.com/haikalzain/arabic-dict-chrome/blob/master/images/screenshot.png)

## Update Screenshot

<img width="623" height="473" alt="image" src="https://github.com/user-attachments/assets/f9f53305-7ec5-4e02-b044-7becead2571f" />
<img width="583" height="374" alt="image" src="https://github.com/user-attachments/assets/36ff3440-c8d2-4c06-aa84-f9f746f9f756" />
<img width="596" height="492" alt="image" src="https://github.com/user-attachments/assets/e42adad7-4420-43b7-9879-14351943a15e" />


## Usage

Arabic Dictionary is available for download via the Chrome Web Store. Alternatively, if you wish to tinker around with the code, 
just point to the directory using chrome developer tools to add it as an extension.


## How it works

### Word Lookup
The translation files are from the Linguistic Data Consortium (GPLv2) and are stored in src/data as plain text. When a page loads, 
each word is quickly decomposed into prefix + stem + suffix using data from tableab, tableac and tablebc. Note that in Arabic, a particular word could have different decompositions and thus different definitions.
The definitions of the prefix, stem and suffix are looked up and concantenated to form the final definition.

### Display
All Arabic words on the page are wrapped in span tags, some js is injected so that when the user hovers over the mouse, a tooltip with the definitions are shown.

## Wishlist
1. More translation data.
2. Firefox port.

