# Coin Catcher

PhonePe Precious Metals themed catcher game. Catch wealth icons for 60 seconds, beat your best score, and climb the leaderboard.

**Play:** [https://basketcatcher-six.vercel.app](https://basketcatcher-six.vercel.app)

## How to play

1. Enter your name and press **Play**.
2. Move with the joystick, A/D, or arrow keys.
3. Catch Payments, Investments, Insurance, and Savings for **+10**.
4. A miss costs **−10**. The round does not end early.
5. Same name keeps **one** leaderboard row. It updates only if the new score is higher.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Stack

HTML, CSS, and JavaScript. Scores are stored in the browser (`localStorage`).
