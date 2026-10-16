# Eushin's Space Words

A calm, space-themed English spelling game for a 5-year-old, made for iPad in landscape. Coco the little alien guides sixteen games, and every right answer earns a star that moves the rocket from planet to planet. Stars have no limit: after Star Land a new planet keeps opening up (40 stars apart at first, growing slowly to 80), each with its own name, colors and alien residents. Tap any reached planet on the map to visit it. A mission with no mistakes earns 2 bonus stars.

**Spelling**
- **Word Cards**: see the word, hear it, and hear it spelled letter by letter.
- **Letter Rocket**: tap the letters in order to spell the word.
- **Missing Star**: pick the missing letter.
- **Vowel Hunt**: every vowel is missing; put a, e, i, o, u back in order.
- **Chunk Builder**: join word parts in order (c + at, rock + et, be + cause).
- **Peek & Spell**: look at the word, it hides, then spell it from memory (peek again if needed).
- **Spelling Bee**: hear the word and type it on an a–z keyboard.
- **Meteor Spell**: pick the correctly spelled word among look-alikes.
- **Trace & Write**: trace the word with Apple Pencil, then write it alone.

**Word games**
- **Sound Hunt**: listen and pick the right picture.
- **Memory Match**: flip cards to find pairs: a picture and its word, or two same word cards when a word has no picture.
- **Star Catch**: listen and tap the falling star with that word.

**Sentences**
- **Sentence Maker**: spell a word into a sentence ("I see a ___."), then hear the whole sentence.
- **Sentence Writer**: write the week's sentence word by word, spelling each word with letter tiles.
- **Sentence Trace**: trace the sentence with Apple Pencil, then write it alone.
- **Sentence Ship**: listen, build the sentence from word blocks, then fill in a blank.

## Themes

Each child picks one of four worlds the first time they play: **Space Adventure** (Coco the alien, planets, stars), **Princess Kingdom** (Rosie the royal kitten, castles and kingdoms, gems), **Robot City** (Bolt the robot, city districts, energy bolts) or **Unicorn Wonderland** (Luna the unicorn, magic lands over the rainbow, crystals). The picture cards show the difference without reading, a tap previews the whole world, and **이 테마로 시작하기** confirms. The theme can be changed any time from the palette button on the home screen or in the grown-ups menu.

All four themes share the same games, stars and levels. A theme only changes colors, the guide character, place names and pictures, and what a star is called, so switching keeps every star, word mastery and visited place, and nothing is awarded twice. Level 3 is Mars, Tea Party Tower, Bolt Bridge or Crystal Cave depending on the theme. Passing a place shows a level-up with that place's badge; at the 3rd and 5th place the guide gets an accessory (all worked out from the star count). Children who already had stars before themes existed stay in Space. Each child keeps their own theme on the device and, after running `supabase/migrations/20261016100000_child_theme.sql`, in their account too.

To add a theme, add one entry to `THEMES` in `src/app.html`: colors, words, 8 places plus name parts for the endless places, and its art.

On first launch a Korean guide for parents walks through adding words, the games, stars and planets, and iPad tips, then lets them pick the child's name. It can be opened again from the lock button (보호자 안내 보기). The guide's last step adds the children's names; names can be changed or more children added later in the grown-ups menu.

Grown-ups add about 10 words and 2 sentences each week from the lock button (it asks a multiplication question first). Children are added and renamed there too, and with more than one child a switcher appears at the top of the home screen.

## Accounts and cloud sync (Supabase)

Parents can sign up with email and password, add several children (each with their own name, stars and word progress), and use the same account on several devices. This week's words are shared by the family. Without Supabase settings the app still works, saving on the device only, and the sign-in screen is not shown.

Set up once:

1. Create a Supabase project (Seoul region: `ap-northeast-2`).
2. Run `supabase/migrations/20261016000000_space_words.sql` and then `20261016100000_child_theme.sql` in the SQL Editor. It creates the `families` and `children` tables with row level security, so each account sees only its own data, plus a `delete_my_account()` function for the in-app account deletion.
3. Authentication → URL Configuration: set **Site URL** to the app's address (`https://www.spelly.kr/app/`) and add it under **Redirect URLs** too. Sign-up confirmation and password reset emails link back there.
4. Authentication → Emails: Supabase's built-in email sender only allows a few emails per hour. Before inviting other families, connect your own SMTP service (for example Resend) under **SMTP Settings**. You can also translate the email templates into Korean there.
5. Put the project URL and its publishable (anon) key into `config.js`, then commit. The publishable key is safe to publish; row level security protects the data.

How sync works: everything is saved on the device first, so the app works offline. When signed in, changes upload in the background, and the app downloads the family's data on start and whenever it comes back to the foreground. For each child and for the week's words, the most recent change wins. Signing up on a device that already has stars moves them into the new account.

## Add to the home screen

- **iPhone / iPad (Safari):** open **https://www.spelly.kr/app/**, tap **Share**, then **Add to Home Screen** → **Add**.
- **Android (Chrome):** open the same address, tap the **⋮** menu, then **Add to Home screen** or **Install app**. On Samsung Internet: **≡ menu → Add page to → Home screen**. When Chrome offers it, the grown-ups menu also shows an **지금 설치하기** button.

It opens full screen as **Spelly** and works offline after the first visit. The landing page and the app's grown-ups menu and parent guide show these steps, opening the tab for the visitor's device.

Words, stars and the name are saved on that iPad. Reading words from a worksheet photo works only in the Claude artifact version of the app.

## Website

`www.spelly.kr` (Vercel; `spelly.kr` redirects there) serves the landing page at `/` and the app at `/app/`. Home-screen installs and sign-in links that still open `/` are sent on to `/app/`, and the old top-level `sw.js` now only removes itself, so devices from before the move switch over cleanly (same domain, so stars and words stay).

## Files

- `index.html`, `assets/`: the landing page (hand-written) and its pictures (theme scenes and guides taken from the app, app screenshots).
- `src/app.html`: the app itself (styles, markup and script in one file). Edit this one.
- `build.mjs`: wraps `src/app.html` into `app/index.html` with the home-screen app settings, and bumps the offline cache version in `app/sw.js`.
- `app/index.html`: the built app page. Don't edit it by hand.
- `app/manifest.webmanifest`, `app/sw.js`, `icons/`: home-screen app name, offline support and icons.
- `vercel.json`: `/app` → `/app/` redirect and no-cache headers for the service workers.
- `config.js`: Supabase URL and publishable key (empty means device-only).
- `vendor/supabase-2.49.4.js`: the Supabase client, kept in the repo so the app opens offline.
- `supabase/migrations/`: database tables and security rules.

After editing `src/app.html`, rebuild and commit both files:

```bash
node build.mjs
```
