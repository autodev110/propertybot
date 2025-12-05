import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  Client,
  FinalEmailRecord,
  SearchSession,
  SearchSessionSummary,
} from "./types";

// On Vercel the filesystem is read-only except /tmp; allow override via env for portability.
const dataDir =
  process.env.DATA_DIR ||
  (process.env.VERCEL ? path.join("/tmp", "propertybot") : path.join(process.cwd(), "data"));
const clientsDir = path.join(dataDir, "clients");
const searchesDir = path.join(dataDir, "searches");

async function ensureDirs() {
  await fs.mkdir(clientsDir, { recursive: true });
  await fs.mkdir(searchesDir, { recursive: true });
  await fs.mkdir(path.join(dataDir, "logs"), { recursive: true });
}

function clientFilePath(id: string) {
  return path.join(clientsDir, `${id}.json`);
}

function searchFilePath(id: string) {
  return path.join(searchesDir, `${id}.json`);
}

export async function getOrCreateClientByEmail(
  name: string,
  email: string
): Promise<Client> {
  await ensureDirs();
  const normalizedEmail = email.toLowerCase();
  const files = await fs.readdir(clientsDir).catch(() => []);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(clientsDir, file), "utf-8");
    const client = JSON.parse(raw) as Client;
    if (client.email.toLowerCase() === normalizedEmail) {
      if (client.name !== name) {
        client.name = name;
        await fs.writeFile(clientFilePath(client.id), JSON.stringify(client, null, 2));
      }
      return client;
    }
  }

  const newClient: Client = {
    id: randomUUID(),
    name,
    email,
    createdAt: new Date().toISOString(),
    searches: [],
  };
  await fs.writeFile(clientFilePath(newClient.id), JSON.stringify(newClient, null, 2));
  return newClient;
}

export async function saveClient(client: Client): Promise<void> {
  await ensureDirs();
  await fs.writeFile(clientFilePath(client.id), JSON.stringify(client, null, 2));
}

export async function createSearchSession(input: {
  clientId: string;
  preferredLocation: string;
  clientNotes: string;
  minPrice?: number;
  maxPrice?: number;
  zillowSearchUrl: string;
}): Promise<SearchSession> {
  await ensureDirs();
  const session: SearchSession = {
    id: randomUUID(),
    clientId: input.clientId,
    createdAt: new Date().toISOString(),
    preferredLocation: input.preferredLocation,
    clientNotes: input.clientNotes,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    zillowSearchUrl: input.zillowSearchUrl,
    candidateCount: 0,
    evaluatedProperties: [],
  };
  await fs.writeFile(searchFilePath(session.id), JSON.stringify(session, null, 2));
  return session;
}

export async function saveSearchSession(session: SearchSession): Promise<void> {
  await ensureDirs();
  await fs.writeFile(searchFilePath(session.id), JSON.stringify(session, null, 2));
}

export async function getSearchSession(searchId: string): Promise<SearchSession | null> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(searchFilePath(searchId), "utf-8");
    return JSON.parse(raw) as SearchSession;
  } catch (err) {
    return null;
  }
}

export async function listClients(): Promise<Client[]> {
  await ensureDirs();
  const files = await fs.readdir(clientsDir).catch(() => []);
  const clients: Client[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(clientsDir, file), "utf-8");
    clients.push(JSON.parse(raw) as Client);
  }
  return clients.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function appendSearchToClient(
  client: Client,
  summary: SearchSessionSummary
): Promise<Client> {
  client.searches = [summary, ...client.searches.filter((s) => s.id !== summary.id)];
  await saveClient(client);
  return client;
}

export async function updateSearchSummaryEmailSent(
  clientId: string,
  searchId: string,
  hasEmailSent: boolean
): Promise<void> {
  const client = await getClientById(clientId);
  if (!client) return;
  client.searches = client.searches.map((s) =>
    s.id === searchId ? { ...s, hasEmailSent } : s
  );
  await saveClient(client);
}

export async function getClientById(clientId: string): Promise<Client | null> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(clientFilePath(clientId), "utf-8");
    return JSON.parse(raw) as Client;
  } catch (err) {
    return null;
  }
}

export async function logEmailSend(record: FinalEmailRecord & { clientId: string; searchId: string }) {
  await ensureDirs();
  const logPath = path.join(dataDir, "logs", "emails.log");
  const line = JSON.stringify(record) + "\n";
  await fs.appendFile(logPath, line, "utf-8");
}

export async function deleteSearchSession(searchId: string): Promise<void> {
  await ensureDirs();
  await fs.rm(searchFilePath(searchId)).catch(() => {});
}

export async function deleteClientAndSearches(clientId: string): Promise<void> {
  await ensureDirs();
  const client = await getClientById(clientId);
  if (client) {
    for (const s of client.searches) {
      await deleteSearchSession(s.id);
    }
  }
  await fs.rm(clientFilePath(clientId)).catch(() => {});
}
