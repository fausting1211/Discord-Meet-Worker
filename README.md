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
