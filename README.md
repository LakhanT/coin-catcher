# Coin Catcher

PhonePe Precious Metals themed catcher game. Catch wealth icons for 30 seconds, beat your best score, and climb the leaderboard.

**Play:** [https://coin-catcher.vercel.app](https://coin-catcher.vercel.app)

<p align="center">
  <img src="screenshots/home.jpg" alt="Coin Catcher home screen" width="720">
</p>

<p align="center">
  <img src="assets/icon-payments.png" alt="Payments" width="72">
  <img src="assets/icon-invest.png" alt="Investments" width="72">
  <img src="assets/icon-insurance.png" alt="Insurance" width="72">
  <img src="assets/icon-savings.png" alt="Savings" width="72">
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
2. Move with the joystick, A/D, or arrow keys.
3. Catch Payments, Investments, Insurance, and Savings for **+10**.
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
