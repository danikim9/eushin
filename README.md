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

On first launch a Korean guide for parents walks through adding words, the games, stars and planets, and iPad tips, then lets them pick the child's name. It can be opened again from the lock button (보호자 안내 보기). The guide's last step adds the children's names; names can be changed or more children added later in the grown-ups menu.

Grown-ups add about 10 words and 2 sentences each week from the lock button (it asks a multiplication question first). Children are added and renamed there too, and with more than one child a switcher appears at the top of the home screen.

## Accounts and cloud sync (Supabase)

Parents can sign up with email and password, add several children (each with their own name, stars and word progress), and use the same account on several devices. This week's words are shared by the family. Without Supabase settings the app still works, saving on the device only, and the sign-in screen is not shown.

Set up once:

1. Create a Supabase project (Seoul region: `ap-northeast-2`).
2. Run `supabase/migrations/20261016000000_space_words.sql` in the SQL Editor. It creates the `families` and `children` tables with row level security, so each account sees only its own data, plus a `delete_my_account()` function for the in-app account deletion.
3. Authentication → URL Configuration: set **Site URL** to the app's address (for example the Vercel URL) and add the same address under **Redirect URLs**. Sign-up confirmation and password reset emails link back there.
4. Authentication → Emails: Supabase's built-in email sender only allows a few emails per hour. Before inviting other families, connect your own SMTP service (for example Resend) under **SMTP Settings**. You can also translate the email templates into Korean there.
5. Put the project URL and its publishable (anon) key into `config.js`, then commit. The publishable key is safe to publish; row level security protects the data.

How sync works: everything is saved on the device first, so the app works offline. When signed in, changes upload in the background, and the app downloads the family's data on start and whenever it comes back to the foreground. For each child and for the week's words, the most recent change wins. Signing up on a device that already has stars moves them into the new account.

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
- `config.js`: Supabase URL and publishable key (empty means device-only).
- `vendor/supabase-2.49.4.js`: the Supabase client, kept in the repo so the app opens offline.
- `supabase/migrations/`: database tables and security rules.

After editing `src/app.html`, rebuild and commit both files:

```bash
node build.mjs
```
