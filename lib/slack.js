import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTBOX_PATH = join(__dirname, "..", "data", "slack-outbox.json");

const loadOutbox = async () => {
  try {
    return JSON.parse(await readFile(OUTBOX_PATH, "utf8"));
  } catch {
    return [];
  }
};
const saveOutbox = async (entries) => writeFile(OUTBOX_PATH, JSON.stringify(entries, null, 2));

const buildMessage = ({ ticket, operator }) =>
  `[${ticket.id}] ${ticket.subject} — solved by ${operator}.`;

export async function postSolvedNotification({ ticket, operator }) {
  const message = buildMessage({ ticket, operator });
  const entry = {
    id: `SLK-${String(Date.now()).slice(-8)}`,
    ticket_id: ticket.id,
    operator,
    message,
    sent_at: new Date().toISOString(),
    stub: true,
  };

  console.log(`[SLACK STUB] ${message}`);

  try {
    const outbox = await loadOutbox();
    outbox.unshift(entry);
    await saveOutbox(outbox);
  } catch (err) {
    console.error(`[SLACK STUB] outbox write failed:`, err.message);
  }

  return entry;
}
