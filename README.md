# אליאס – Alias (Hebrew)

A digital, Hebrew-only, right-to-left version of the family word game **אליאס**, built with React Native, Expo (SDK 57) and TypeScript.

<p>
  <img src="docs/screenshots/1-setup.png" width="180" alt="מסך פתיחה" />
  <img src="docs/screenshots/2-board.png" width="180" alt="לוח המשחק" />
  <img src="docs/screenshots/3-game.png" width="180" alt="תור פעיל" />
  <img src="docs/screenshots/7-board-fullscreen.png" width="180" alt="סיבוב הלוח" />
  <img src="docs/screenshots/8-room.png" width="320" alt="הסלון" />
  <img src="docs/screenshots/5-summary.png" width="180" alt="סיכום תור" />
</p>

## How to play (איך משחקים)

- 4–12 players split into 2–6 teams.
- On each turn one player explains as many words as possible before the sand timer runs out (60 seconds by default).
- **Steal squares** (red with a white ring, placed at random each game): a team whose pawn lands on or passes one plays its next turn as a steal turn. Every team guesses at the same time, and each word gives a step to the team that guessed it first, so rivals can steal steps.
- Every card has 8 numbered words. The number (1–8) of the square your pawn stands on says which word on each card you explain.
- The explainer may use synonyms, antonyms, hints and associations, but may **never** say the word or any part of it.
- Every correct word is one step forward on the board. The first team to reach the finish square wins.
- When time runs out, every team can guess the last word on screen. Tap the team that guessed it (or "אף אחד") and that team moves one step forward.
- Optional classic rule: a skipped word moves the team one step back.

## Run it

```bash
npm install
npx expo start          # then scan the QR code with Expo Go, or press a / i / w
```

### Bootstrap from scratch (how this project was created)

```bash
npx create-expo-app@latest alias-hebrew --template blank-typescript
cd alias-hebrew
npx expo install expo-localization expo-haptics react-native-safe-area-context
npx expo install react-dom react-native-web @expo/metro-runtime   # optional: web support
```

Then copy in `App.tsx`, `index.ts`, `app.json`, `vercel.json` and the `src/` and `public/` folders from this repository.

## Deploy the web version to Vercel

`vercel.json` builds the app as a static web app (`npx expo export --platform web` → `dist/`).

- **From the dashboard:** vercel.com → Add New → Project → import the GitHub repo → Deploy. No settings need changing; `vercel.json` provides the install and build commands and the output folder.
- **From a terminal:** run `npx vercel --prod` in the repository root.

`public/index.html` is the web page template (`lang="he" dir="rtl"`, red background, Hebrew title).

## Online play (each player on their own phone)

The home screen offers **📱 one device** (pass the phone around) or **🌐 online with friends**:

1. The host signs in with Google and creates a room. They get a 5-letter code and an **invite link** (WhatsApp / copy).
2. Each friend opens the link on their own phone, signs in with Google and **picks a team**. The lobby shows everyone with their Google photo, in explaining order.
3. The host sets team names, the finish square and the turn length, then starts.
4. **The explainer rotates:** each turn, the team's next player explains, like the physical game.
   - Only the **explainer's phone** shows the card and the נכון / דלג buttons.
   - Teammates see "נחשו!". Other teams see who is guessing. In a steal turn, "כולם מנחשים!".
5. Everything is live on every phone: pawns, the sand timer (synchronised to the server's clock), scores and sounds. If the explainer leaves, the host can run the turn.

Online play is web-only for now (Google sign-in in the browser).

### Setting up Firebase (once, free)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**.
3. **Authentication → Settings → Authorized domains → Add domain**: your Vercel domain (e.g. `alias-hebrew-xi.vercel.app`).
4. **Build → Firestore Database → Create database** (production mode, any region).
5. **Firestore → Rules**: paste the contents of [`firestore.rules`](firestore.rules) → **Publish**.
6. **Project settings → Your apps → Web (`</>`)** → register an app → copy the config values.
7. **Vercel → your project → Settings → Environment Variables**: add the six `EXPO_PUBLIC_FIREBASE_*` values (see [`.env.example`](.env.example)), then **Redeploy**.

These are public client settings, not secrets. Access is enforced by the security rules.

### Security, rate limits and load

- **Rules** ([`firestore.rules`](firestore.rules)):
  - Google sign-in is required, and rooms can't be listed or scanned; you need the code.
  - Players can only change their own entry, only members can change the game, and only the host can change settings.
  - Every write is validated: field types and sizes, at most 20 players, 2–6 teams, the game under 300 KB.
  - Clock-sync pings can only be written by members of an existing room.
- **Rooms expire** 2 days after creation: they can no longer be opened, joined or played (old codes are useless).
- **Rate limit:** a room accepts at most one game or settings change every 100 ms (enforced by the server rules). The app spaces writes 120 ms apart, ignores double taps, and caps queued actions.
- **Consistency:** every action runs in a Firestore transaction (read → pure reducer → write), with retries and exponential backoff on contention or network errors. A lost connection shows a notice, and corrupt data never crashes the screen (an error boundary catches the rest).
- **Tested** against the Firebase emulators:
  - Rules checks: `npm run emulators`, then `npm run test:rules`.
  - A load test: 12 players joined one room simultaneously (all succeeded), 6 players sent 90 rapid actions at once (no errors, final state consistent).
  - A 4-browser end-to-end game.
- **Cost:** the free Spark plan (50k reads / 20k writes a day) covers roughly 15 full 8-player games a day. Every answer is 1 write plus 1 read per player. For more, switch to Blaze (pay as you go, cents) and set a budget alert.

### Hardening (recommended for a public launch)

1. **Deleting old rooms:** on the free Spark plan, delete them now and then from Firebase console → Firestore → Data (the free 1 GiB holds many thousands of rooms). With billing enabled (Blaze), a TTL policy does it automatically: Google Cloud console → Firestore → **Time-to-live** → collection group `rooms`, field `expiresAt`, and again for `clock`.
2. **[App Check](https://firebase.google.com/docs/app-check)** — only your site can use the project, so scripts can't guess room codes or burn the daily quota:
   - Firebase console → **App Check** → **Apps** → your web app → **Fraud Defense** (formerly reCAPTCHA Enterprise) → create a key for your Vercel domain → **Save**.
   - Vercel: add `EXPO_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` = that site key, then redeploy.
   - After a day, check the App Check metrics show your traffic as verified, then **Enforce** for Cloud Firestore and Authentication.
3. **Restrict the API key:** Google Cloud console → APIs & Services → **Credentials** → the "Browser key" → **Website restrictions**: `https://<your-app>.vercel.app/*` and `https://<project-id>.firebaseapp.com/*`.

## The 3D table

After setup, the whole game is played on one full-screen 3D table (three.js through `@react-three/fiber`, `expo-gl` on phones). Each phase only swaps the panels over it:

- **Board:** raised speech-bubble squares numbered **1–8 over and over**, a glowing start and the ✌ finish. The spiral track is sized to the chosen finish square (20–50).
- **Camera:** drag with a finger or the mouse to orbit around the board; pinch or use the mouse wheel to zoom. The camera always aims at the middle of the table and keeps the whole table in view in the space between the panels, from any angle. ⟲ resets the view.
- **Sand timer = turn clock:** when a turn starts it flips over, then the sand runs from the top bulb to the bottom for exactly the turn length. The clock starts once the flip finishes.
- **Cards:** a card lifts off the deck and flies up, then appears at the bottom of the screen as a portrait card listing its 8 words from 1 to 8. The team's word (by square number) stays in its place but is big on a red band. נכון / דלג send it away and the next card rises.
- **Living room:** the board sits on a coffee table in a 3D living room (wood floor, rug, sofas, pictures, lamps, a curtained window, TV, plant). Walls between the camera and the table disappear, so orbiting never hides the board. Zoom out to see the whole room.
- **Turn status:** no top bar during a turn. The seconds, ✓ / ↷ counts, points and pause float to the right of the card.
- **Sound:** a chime for נכון, a whoosh for דלג, the sand timer flipping, a clock ticking through the last 10 seconds, a bell when time is up, and a "tok" for every square a pawn hops. 🔊 mutes. The sounds are synthesised by `node scripts/make-sounds.mjs` into `assets/sounds/`.
- **Pawns:** each team's pawn hops square by square after every turn. The next team has a glowing ring, and the winner's pawn dances.

Textures (number discs, logo, card backs, wood floor) live in `assets/3d/`. They are generated by `node scripts/make-textures.mjs`, which needs Playwright.

## RTL (right-to-left)

RTL is applied in three layers so it holds in every environment:

1. **`app.json`**: the `expo-localization` plugin sets `supportsRTL` and `forcesRTL`, so dev and production builds start in RTL.
2. **`index.ts`**: calls `I18nManager.allowRTL(true)` and `I18nManager.forceRTL(true)` at startup. In Expo Go this takes effect from the next launch.
3. **`App.tsx`**: the root view has `direction: 'rtl'`, so the layout is right-to-left from the very first frame, including on web.

## Folder structure

```
alias-hebrew/
├── App.tsx                     # Setup screen, then the full-screen game stage
├── index.ts                    # Entry point, forces RTL
├── app.json                    # Expo config (red splash, RTL plugin)
├── scripts/make-textures.mjs   # Renders the 3D textures in assets/3d/
└── src/
    ├── theme.ts                # Red and white palette, team pawn colours
    ├── data/words.ts           # Hebrew word bank (~470 words → 8-word cards)
    ├── game/
    │   ├── types.ts            # GameState, Team, actions
    │   ├── gameReducer.ts      # All game rules: cards, turns, scoring, steal turns, winning
    │   ├── board.ts            # Random steal squares per game
    │   └── GameContext.tsx     # useReducer + React context
    ├── sound/sounds.ts         # Sound effects (expo-audio) and mute
    ├── online/                 # Firebase: Google sign-in, rooms, live sync, server clock
    ├── hooks/useCountdown.ts   # Drift-free countdown with pause and start delay
    ├── three/
    │   ├── Board3D.tsx         # 3D table: board, pawns, decks, sand timer, card flight, orbit camera
    │   ├── LivingRoom.tsx      # Living room and coffee table around the board
    │   └── boardLayout.ts      # Spiral track geometry for any finish square
    ├── components/
    │   ├── AliasLogo.tsx       # Speech-bubble logo
    │   ├── BigButton.tsx
    │   └── WordCard.tsx        # Animated 8-word card
    └── screens/
        ├── HomeScreen.tsx      # One device / online
        ├── SetupScreen.tsx     # Teams (2–6), finish square, turn length, rules, live 3D preview
        ├── online/             # Sign-in, create / join, lobby, online game (roles)
        └── stage/
            ├── GameStage.tsx   # Full-screen 3D table + the panel for the current phase
            ├── ScoreboardPanel.tsx
            ├── TurnPanel.tsx   # Sand-timer clock, cards, נכון / דלג, last word
            ├── SummaryPanel.tsx
            └── WinnerPanel.tsx
```

## Game flow

`setup → scoreboard → turn → summary → scoreboard → … → winner`

All state lives in a single reducer (`src/game/gameReducer.ts`):

- **Deck**: the word bank is dealt onto shuffled 8-word cards once per game and drawn without repeats. When the deck runs out it is dealt again.
- **Turn switching**: after each confirmed turn, play passes to the next team. The round counter goes up when play returns to the first team.
- **Scoring**: +1 per correct word (and optionally −1 per skip). The last word gives +1 to whichever team guessed it, and is never penalised. Positions are clamped between 0 and the finish square.
- **Winning**: a team that reaches the finish square wins immediately. If the explaining team and a team that stole the last word both reach it in the same turn, the explaining team wins.

## Adding words

Add strings to `RAW_WORDS` in `src/data/words.ts`. Duplicates are removed automatically.
