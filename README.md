# Discord Meet Worker

A Cloudflare Worker that natively handles Discord slash commands and integrates with Google Calendar to programmatically create events and generate Google Meet links automatically.

## Features

- **Discord Interoperability**: Listens for the Discord `/meet` slash command.
- **Google Calendar Integration**: Automatically creates events in Google Calendar.
- **Google Meet Links**: Generates and attaches Google Meet links to the event automatically.
- **Instant Feedback**: Replies directly within Discord with the meeting details, links, and timing.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI
- Discord Developer Portal application & Bot token.
- Google Cloud Console Project with Calendar API enabled.

---

## Google Meeting Configuration

You need a Google Cloud project with Calendar API enabled and an OAuth 2.0 refresh token so the Worker can create events on your behalf.

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Library**, search for **Google Calendar API**, and click **Enable**.

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (or **Internal** if using Google Workspace).
3. Fill in the required fields (App name, User support email, Developer contact).
4. Under **Scopes**, add `https://www.googleapis.com/auth/calendar`.
5. Under **Test users**, add the Google account that owns the target calendar.

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Add `https://developers.google.com/oauthplayground` to **Authorized redirect URIs**.
4. Note down your **Client ID** and **Client Secret**.

### 4. Obtain a Refresh Token

1. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the ⚙️ gear icon (top-right), check **Use your own OAuth credentials**, and enter your Client ID & Client Secret.
3. In the left panel, find **Google Calendar API v3**, select `https://www.googleapis.com/auth/calendar`, and click **Authorize APIs**.
4. Sign in with the Google account that owns the calendar and grant consent.
5. Click **Exchange authorization code for tokens** and copy the **Refresh Token**.

### 5. Required Environment Variables

| Variable                 | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | OAuth 2.0 Client ID                            |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret                        |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token from OAuth Playground |
| `CALENDAR_ID`          | Target calendar ID (default:`primary`)       |
| `TZ`                   | Timezone for events (default:`Asia/Taipei`)  |

---

## Discord Configuration

You need a Discord application with a Bot and an [Interactions Endpoint URL](https://discord.com/developers/docs/interactions/receiving-and-responding) pointing to your deployed Worker.

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and give it a name.
3. Note down the **Application ID** and **Public Key** from the **General Information** page.

### 2. Set the Interactions Endpoint

1. In your application settings, go to **General Information**.
2. Set **Interactions Endpoint URL** to your deployed Worker URL (e.g. `https://discord-meet-worker.<your-subdomain>.workers.dev`).
3. Discord will send a `PING` to verify — the Worker is already set up to respond with `{ type: 1 }`.

### 3. Add the Bot to Your Server

1. Go to **OAuth2 → URL Generator**.
2. Select scopes: `bot`, `applications.commands`.
3. Select bot permissions: `Send Messages`, `Use Slash Commands`.
4. Copy the generated URL and open it in a browser to invite the bot to your server.

### 4. Register the `/meet` Slash Command

Use the Discord API to register the global slash command. Replace `<APP_ID>` and `<BOT_TOKEN>` with your values:

```bash
curl -X POST "https://discord.com/api/v10/applications/<APP_ID>/commands" \
  -H "Authorization: Bot <BOT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "meet",
    "description": "Create a Google Calendar event with Meet link",
    "options": [
      { "name": "date", "description": "Date (e.g. YYYY-MM-DD)", "type": 3, "required": true },
      { "name": "time", "description": "Time range (e.g. HH:MM-HH:MM)", "type": 3, "required": true },
      { "name": "title", "description": "Event title", "type": 3, "required": false },
      { "name": "invite", "description": "Comma-separated emails to invite", "type": 3, "required": false },
      { "name": "location", "description": "Meeting location", "type": 3, "required": false },
      { "name": "description", "description": "Event description", "type": 3, "required": false }
    ]
  }'
```

> **Note:** Global commands may take up to 1 hour to propagate. Use guild commands for instant testing:
> `https://discord.com/api/v10/applications/<APP_ID>/guilds/<GUILD_ID>/commands`

### 5. Required Discord Secrets

| Variable                   | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `DISCORD_PUBLIC_KEY`     | Application public key (for signature verification) |
| `DISCORD_APPLICATION_ID` | Application ID (for webhook follow-ups)             |

---

## Project Structure

```text
discord-meet-worker/
├── src/
│   ├── index.js       # Main worker entry point (router and orchestration)
│   ├── utils.js       # Utility functions (response formatters, hex helpers, time parsers)
│   ├── discord.js     # Discord signature verification & webhook follow-up logic
│   └── google.js      # Google OAuth access token & Calendar Meet event creation
├── .dev.vars.example  # Environment variables template
├── wrangler.jsonc     # Cloudflare Worker configuration
├── package.json       # Dependencies
└── README.md          # Project documentation
```

## Setup & Configuration

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Setup Cloudflare Worker Secrets:**
   You will need to run the following `wrangler` commands to add environment secrets securely to Cloudflare:

   ```bash
   npx wrangler secret put DISCORD_PUBLIC_KEY
   npx wrangler secret put DISCORD_APPLICATION_ID
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put GOOGLE_REFRESH_TOKEN
   ```

   *(You can also use `.dev.vars` for local development).*
3. **Configure Settings (`wrangler.jsonc`):**
   Open `wrangler.jsonc` and add any non-sensitive configuration options to `vars`, or use secrets to store sensitive defaults in production:

   ```json
   "vars": {
     "DEFAULT_TITLE": "小組會議",
     "DEFAULT_INVITE": "a@gmail.com,b@gmail.com,c@gmail.com",
     "DEFAULT_LOCATION": "204會議室",
     "CALENDAR_ID": "primary",
     "TZ": "Asia/Taipei"
   }
   ```

   Alternatively, run `npx wrangler secret put <VAR>` to insert these if you treat them as private.
4. **Local Development (Optional):**
   Create a `.dev.vars` file in the root directory for local testing containing all environment variables and secrets.

   ```bash
   npm run dev
   ```

## Deployment

To deploy the worker to Cloudflare's edge network:

```bash
npm run deploy
```
