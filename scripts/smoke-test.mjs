import { spawn } from "node:child_process";

const port = 44000 + (process.pid % 1000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), NODE_ENV: "development" },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local server did not start. ${serverOutput.trim()}`);
}

try {
  await waitForServer();

  for (const route of ["/", "/about", "/membership", "/partnerships", "/careers", "/apply", "/contact", "/privacy"]) {
    const response = await fetch(`${origin}${route}`);
    const html = await response.text();
    assert(response.status === 200, `${route} returned ${response.status}`);
    assert(response.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"), `${route} is missing the security policy`);
    assert(/<title>[^<]+<\/title>/i.test(html), `${route} is missing a title`);
    assert(/<meta property="og:title"/i.test(html), `${route} is missing server-rendered Open Graph metadata`);
    assert(/<link rel="canonical" href="https:\/\/heartlink\.in/i.test(html), `${route} is missing a production canonical`);
  }

  const missing = await fetch(`${origin}/not-a-real-page`);
  const missingHtml = await missing.text();
  assert(missing.status === 404, `404 route returned ${missing.status}`);
  assert(/noindex, nofollow/i.test(missingHtml), "404 page is not marked noindex");

  const redirect = await fetch(`${origin}/methodology`, { redirect: "manual" });
  assert(redirect.status === 301, `legacy redirect returned ${redirect.status}`);
  assert(redirect.headers.get("location") === "/membership#process", "legacy redirect target is incorrect");

  const robots = await (await fetch(`${origin}/robots.txt`)).text();
  assert(robots.includes("Disallow: /api/"), "robots.txt does not protect API routes");
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert(sitemap.includes(`<loc>${origin}/apply</loc>`), "sitemap is missing the apply route");

  const invalidSubmission = await fetch(`${origin}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ type: "contact" })
  });
  assert(invalidSubmission.status === 422, `invalid form submission returned ${invalidSubmission.status}`);

  const honeypotSubmission = await fetch(`${origin}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ type: "contact", website: "bot.example" })
  });
  assert(honeypotSubmission.status === 202, `honeypot submission returned ${honeypotSubmission.status}`);

  console.log("Runtime smoke test passed");
} finally {
  server.kill("SIGTERM");
}
