import nacl from "tweetnacl";

function hexToUint8(hex) {
  if (!hex || hex.length % 2 !== 0) throw new Error("Invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function verifyDiscordRequest(request, discordPublicKey) {
  const sig = request.headers.get("X-Signature-Ed25519");
  const ts = request.headers.get("X-Signature-Timestamp");
  if (!sig || !ts) return false;

  const bodyText = await request.clone().text();
  const message = new TextEncoder().encode(ts + bodyText);

  const sigBytes = hexToUint8(sig);
  const pkBytes = hexToUint8(discordPublicKey);

  return nacl.sign.detached.verify(message, sigBytes, pkBytes);
}

export async function followupToDiscord(env, interactionToken, content) {
  const appId = env.DISCORD_APPLICATION_ID;
  const url = `https://discord.com/api/v10/webhooks/${appId}/${interactionToken}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Discord follow-up failed: ${t}`);
  }
}
