# Coin Catcher

PhonePe Precious Metals themed catcher game. Catch gold, silver, and platinum for 30 seconds, beat your best score, and climb the leaderboard.

**Play:** [https://coin-catcher.vercel.app](https://coin-catcher.vercel.app)

<p align="center">
  <img src="screenshots/home.jpg" alt="Coin Catcher home screen" width="720">
</p>

<p align="center">
  <img src="assets/icon-gold.png" alt="Gold" width="72">
  <img src="assets/icon-silver.png" alt="Silver" width="72">
  <img src="assets/icon-platinum.png" alt="Platinum" width="72">
</p>

## Screens

| Home | How to play |
| --- | --- |
| ![Home](screenshots/home.jpg) | ![How to play](screenshots/howto.jpg) |

| In game | Leaderboard |
| --- | --- |
| ![Play](screenshots/play.jpg) | ![Leaderboard](screenshots/leaderboard.jpg) |

## How to play

1. Enter your name and press **Play**.
2. Move by dragging the playfield, or with A/D and arrow keys.
3. Catch Gold, Silver, and Platinum for **+10**.
4. A miss costs **−10**. The round does not end early.
5. Each new player gets a new leaderboard row, even if the name is already used. **Play again** updates that sitting only.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Stack

HTML, CSS, and JavaScript. Scores are stored in the browser (`localStorage`).
