# Eushin's Space Words

A calm, space-themed English spelling game for a 5-year-old, made for iPad in landscape. Coco the little alien guides six games, and every right answer earns a star that moves the rocket from planet to planet.

**Games**
- **Word Cards**: see the word, hear it, and hear it spelled letter by letter.
- **Trace & Write**: trace the word with Apple Pencil, then write it alone.
- **Letter Rocket**: tap the letters in order to spell the word.
- **Missing Star**: pick the missing letter.
- **Sound Hunt**: listen and pick the right picture.
- **Sentence Ship**: listen, build the sentence from word blocks, then fill in a blank.

Grown-ups add about 10 words and 2 sentences each week from the lock button (it asks a multiplication question first). The child's name (Eushin or Harry) is set there too.

## Install on iPad

1. Open the app's GitHub Pages address in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**.
3. Open **Space Words** from the home screen. It runs full screen and works offline after the first visit.

Words, stars and the name are saved on that iPad. Reading words from a worksheet photo works only in the Claude artifact version of the app.

## Files

- `src/app.html`: the app itself (styles, markup and script in one file). Edit this one.
- `build.mjs`: wraps `src/app.html` into `index.html` with the home-screen app settings, and bumps the offline cache version.
- `index.html`: the built page that GitHub Pages serves. Don't edit it by hand.
- `manifest.webmanifest`, `sw.js`, `icons/`: home-screen app name, offline support and icons.

After editing `src/app.html`, rebuild and commit both files:

```bash
node build.mjs
```
