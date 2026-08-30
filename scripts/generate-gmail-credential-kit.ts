import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rosterPath = resolve(process.cwd(), "GW Swimmers Email 26-27.csv");
const credentialsPath = resolve(process.cwd(), "credentials-2026-08-28T21-20-56.396Z.csv");
const mergePath = resolve(process.cwd(), "credentials-gmail-mail-merge-2026-27.csv");
const templatePath = resolve(process.cwd(), "credentials-gmail-template-2026-27.html");

const credentialAliases = new Map([
  ["benjamin sosnowski", "ben sosnowski"],
  ["heitor napolitano", "heitor reis"],
  ["nerea gutierrez", "nerea gutierrez-steinhauer"],
  ["sori ebrahimi", "soraya ebrahimi"],
]);

async function main() {
  const roster = parseCsv(await readFile(rosterPath, "utf8"));
  const credentials = parseCsv(await readFile(credentialsPath, "utf8"));
  const credentialByName = new Map(credentials.map((row) => [normalize(row.Name), row]));
  const usedCredentials = new Set<string>();

  const merged = roster.map((row) => {
    const rosterName = normalize(`${row["First Name"]} ${row["Last Name"]}`);
    const credentialName = credentialAliases.get(rosterName) ?? rosterName;
    const credential = credentialByName.get(credentialName);
    if (!credential) throw new Error(`No credential match for ${row["First Name"]} ${row["Last Name"]}.`);
    if (!/^\d{6}$/.test(credential["Temporary PIN"] ?? "")) throw new Error(`Invalid PIN for ${credential.Name}.`);
    if (usedCredentials.has(credentialName)) throw new Error(`Credential ${credential.Name} was matched more than once.`);
    usedCredentials.add(credentialName);
    return {
      Email: row["E-mail 1 - Value"].trim(),
      FirstName: row["First Name"].trim(),
      LastName: row["Last Name"].trim(),
      Username: credential.Username,
      PIN: credential["Temporary PIN"],
    };
  });

  if (merged.length !== credentials.length || usedCredentials.size !== credentials.length) {
    const unused = credentials.filter((row) => !usedCredentials.has(normalize(row.Name))).map((row) => row.Name);
    throw new Error(`Expected a one-to-one roster match. Unused credentials: ${unused.join(", ") || "none"}.`);
  }
  if (new Set(merged.map((row) => row.Email.toLowerCase())).size !== merged.length) throw new Error("Roster emails are not unique.");
  if (new Set(merged.map((row) => row.Username)).size !== merged.length) throw new Error("Usernames are not unique.");

  const headers = ["Email", "FirstName", "LastName", "Username", "PIN"] as const;
  const mergeCsv = [
    headers.join(","),
    ...merged.map((row) => headers.map((header) => csvCell(header === "PIN" ? `'${row[header]}` : row[header])).join(",")),
  ].join("\n");
  await writeFile(mergePath, `${mergeCsv}\n`, { mode: 0o600 });
  await writeFile(templatePath, gmailTemplate, { mode: 0o600 });
  process.stdout.write(`Created a ${merged.length}-recipient Gmail merge file and styled template.\n${mergePath}\n${templatePath}\n`);
}

function parseCsv(source: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted && character === '"' && source[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [headers, ...values] = rows;
  if (!headers) return [];
  return values.map((fields) => Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ""])));
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

const gmailTemplate = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GW SwimTrack Gmail template</title></head>
<body style="margin:0;background:#e9f0f2;font-family:Arial,Helvetica,sans-serif;color:#17384d">
  <div style="max-width:680px;margin:28px auto;padding:0 16px">
    <div style="margin-bottom:18px;padding:16px 18px;border:1px solid #d5e0e5;border-radius:14px;background:#fff;font-size:14px;line-height:1.55;color:#526778">
      <strong style="color:#0a304a">Gmail setup:</strong> Copy the email card below into a rich-text Gmail draft. Replace each gold placeholder by typing <strong>@</strong> and selecting the matching Sheet column. Replace <strong>APP_LOGIN_URL</strong> once with the deployed login URL.
      <button type="button" onclick="copyEmail()" style="display:block;margin-top:12px;border:0;border-radius:10px;background:#0a304a;color:#fff;padding:10px 15px;font-weight:700;cursor:pointer">Copy styled email</button>
      <span id="copy-status" style="display:block;margin-top:8px;color:#2f7d62"></span>
    </div>
    <div id="email-card" style="background:#f4f7f8;padding:24px 16px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;margin:0 auto;border-collapse:separate">
        <tr><td style="border-radius:20px 20px 0 0;background:#0a304a;padding:26px 30px;border-bottom:4px solid #55c5cf">
          <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#ddcfb1">GW Swimming</div>
          <div style="margin-top:8px;font-size:26px;font-weight:800;letter-spacing:-.02em;color:#fff">〰 GW SwimTrack</div>
          <div style="margin-top:8px;font-size:14px;line-height:1.5;color:#b8cbd5">Your daily wellness and training dashboard</div>
        </td></tr>
        <tr><td style="background:#fff;padding:30px;border-radius:0 0 20px 20px">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#304a5d">Hi <span style="background:#fff4d6;color:#705a32;padding:2px 6px;border-radius:5px;font-weight:700">@FirstName</span>,</p>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#526778">Your personal GW SwimTrack account is ready. Use it to complete daily check-ins and review your training trends.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dce5e9;border-radius:14px;background:#f7fafb">
            <tr><td style="padding:17px 20px;border-bottom:1px solid #dce5e9;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8d7448">Username</td><td style="padding:17px 20px;border-bottom:1px solid #dce5e9;text-align:right;font-family:Courier New,monospace;font-size:16px;font-weight:700;color:#0a304a"><span style="background:#fff4d6;padding:3px 7px;border-radius:5px">@Username</span></td></tr>
            <tr><td style="padding:17px 20px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8d7448">Six-digit PIN</td><td style="padding:17px 20px;text-align:right;font-family:Courier New,monospace;font-size:18px;font-weight:700;letter-spacing:.12em;color:#0a304a"><span style="background:#fff4d6;padding:3px 7px;border-radius:5px">@PIN</span></td></tr>
          </table>
          <p style="margin:22px 0 8px;font-size:15px;font-weight:700;color:#17384d">Sign in</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#526778">Open <a href="APP_LOGIN_URL" style="color:#0a6f7e;font-weight:700">APP_LOGIN_URL</a> and enter the username and PIN above.</p>
          <div style="border-left:4px solid #55c5cf;background:#eaf7f8;padding:14px 16px;border-radius:0 10px 10px 0;font-size:13px;line-height:1.65;color:#304a5d"><strong>Save it like an app:</strong><br>iPhone: Safari → Share → Add to Home Screen<br>Android: Google Chrome → Install app, or ⋮ → Add to Home screen</div>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#718491">This login is personal. Please don’t forward this email or share your PIN. If it doesn’t work, reply to this message so the team administrator can reset it.</p>
          <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#304a5d">See you at the pool,<br><strong style="color:#0a304a">GW Swimming</strong></p>
        </td></tr>
      </table>
    </div>
  </div>
  <script>
    async function copyEmail() {
      const card = document.getElementById('email-card');
      const html = card.innerHTML;
      const text = card.innerText;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
        document.getElementById('copy-status').textContent = 'Copied. Paste into Gmail, then insert the three merge-tag chips.';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(card);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        document.getElementById('copy-status').textContent = 'Copied. Paste into Gmail, then insert the three merge-tag chips.';
      }
    }
  </script>
</body>
</html>`;

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
