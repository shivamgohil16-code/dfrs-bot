# Defence Fire and Rescue Service Bot

A Discord bot that logs personnel quota time straight into your ORBAT Google Sheet.

Command: **`/logpatrol username:<name> seconds:<number> [screenshot]`**

What it does:
1. Looks up `username` in the ORBAT sheet's **USERNAME** column.
2. Adds `seconds` to whatever is already in their **QUOTA** cell (converted from `HH:MM:SS`).
3. Writes the new total back as `HH:MM:SS`.
4. Colours that cell **green** if the total is ≥ 30 minutes (1800s, configurable), **red** if not — exactly like the manual sheet.
5. Posts a log message in the format:

   ```
   Username:
   Date: DD/MM/YYYY
   Seconds:
   Converted time: HH:MM:SS
   @ORBAT Manager
   ```

   including an optional attached stopwatch screenshot, and pings the ORBAT Manager role.

---

## 1. Create the Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → name it "Defence Fire and Rescue Service Bot".
2. Under **Bot**, click **Reset Token** and copy it → this is `DISCORD_TOKEN`.
3. Under **General Information**, copy the **Application ID** → this is `CLIENT_ID`.
4. Under **Bot**, you do NOT need the "Message Content" intent for this bot (slash commands only).
5. Under **OAuth2 → URL Generator**, tick scopes `bot` and `applications.commands`, and under bot permissions tick `Send Messages`, `Embed Links`, `Attach Files`, `Use Slash Commands`. Open the generated URL and invite the bot to your server.
6. In Discord, enable Developer Mode (User Settings → Advanced), then right-click your server → **Copy Server ID** → this is `GUILD_ID`. Right-click the ORBAT Manager role → **Copy Role ID** → this is `ORBAT_MANAGER_ROLE_ID`.

## 2. Create the Google service account

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project, then enable the **Google Sheets API** for it.
2. Go to **IAM & Admin → Service Accounts → Create Service Account**. Any name is fine.
3. Open the new service account → **Keys → Add Key → Create new key → JSON**. This downloads a `.json` file — keep it safe, never commit it.
4. From that JSON file you need two values:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (keep the `\n` characters exactly as in the file, wrapped in quotes)
5. Open your ORBAT Google Sheet → **Share** → paste the service account's email in → give it **Editor** access.
6. Copy the spreadsheet ID out of its URL: `https://docs.google.com/spreadsheets/d/THIS_ID/edit` → `GOOGLE_SHEET_ID`.
7. Note the exact name of the tab (bottom of the sheet) your roster is on → `GOOGLE_SHEET_NAME`.

## 3. Configure

```bash
cp .env.example .env
```

Fill in every value in `.env`. The bottom of the file also lets you set which columns hold the username and quota (`COL_USERNAME`, `COL_QUOTA` — defaults `A` and `C`, matching the screenshot layout), the header row, the quota target in seconds (default `1800` = 30 min), and the timezone used for the date stamp.

> If your sheet's columns are ever reordered, just change `COL_USERNAME` / `COL_QUOTA` in `.env` — no code changes needed.

## 4. Install & run

```bash
npm install
npm run deploy   # registers the /logpatrol command (run again any time you change it)
npm start        # starts the bot
```

Keep it running with something like [pm2](https://pm2.keymetrics.io/) (`pm2 start index.js --name dfrs-bot`) or host it on a small always-on box (Railway, Render, a VPS, etc.) — a Discord bot needs to stay connected 24/7 to respond to commands.

## 5. Using it

In any channel the bot can see, run:

```
/logpatrol username: FF | aycaibs  seconds: 2188  screenshot: (attach the stopwatch screenshot)
```

The bot replies with the log embed, pings `@ORBAT Manager`, and the sheet's QUOTA cell for that person updates and recolours automatically.

## Notes & things you may want to tweak

- **Username matching** is case-insensitive and ignores a leading `@`, so `FF | aycaibs` and `@ff | aycaibs` both match the same row.
- If a username isn't found on the sheet, the bot tells the invoker instead of guessing — add the person to the ORBAT first.
- Quota totals accumulate forever (e.g. `02:03:20`). If you want quota to reset weekly/monthly, add a scheduled job that clears the QUOTA column back to `00:00:00` — happy to add that if useful.
- The bot only needs the `Guilds` gateway intent, so it stays lightweight and doesn't need Discord's privileged intents approval.
