import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import { createStarterContent } from "../../../src/data/demoData.js";

const STORE = getStore("sullys-grand-flashcards");
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function accountKey(email) {
  return `account:${email}`;
}

function sessionKey(token) {
  return `session:${token}`;
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

export function validateCredentials({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  if (!String(password ?? "").trim()) {
    throw new Error("Password is required.");
  }

  if (name !== undefined && !String(name ?? "").trim()) {
    throw new Error("Name is required.");
  }

  return {
    name: name ? String(name).trim() : "",
    email: normalizedEmail,
    password: String(password),
  };
}

function sanitizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeObject(value) {
  return value && typeof value === "object" ? value : {};
}

export function buildClientState(account) {
  return {
    currentUserId: account.user.id,
    users: [account.user],
    folders: sanitizeArray(account.folders),
    sets: sanitizeArray(account.sets),
    progressByUser: {
      [account.user.id]: sanitizeObject(account.progress),
    },
  };
}

export async function getAccountByEmail(email) {
  const data = await STORE.get(accountKey(email), { type: "json" });
  return data ?? null;
}

export async function saveAccount(account) {
  await STORE.setJSON(accountKey(account.user.email), {
    ...account,
    updatedAt: new Date().toISOString(),
  });
}

export async function createSession(email) {
  const token = crypto.randomBytes(32).toString("hex");
  await STORE.setJSON(sessionKey(token), {
    email,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

export async function getSession(token) {
  if (!token) {
    return null;
  }

  const session = await STORE.get(sessionKey(token), { type: "json" });
  if (!session) {
    return null;
  }

  if (Number(session.expiresAt) < Date.now()) {
    await STORE.delete(sessionKey(token));
    return null;
  }

  return session;
}

export async function signupAccount({ name, email, password }) {
  const existing = await getAccountByEmail(email);
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const userId = `user-${crypto.randomUUID()}`;
  const starter = createStarterContent(userId);
  const user = {
    id: userId,
    name,
    email,
    createdAt: new Date().toISOString(),
  };

  const account = {
    passwordHash: hashPassword(password),
    user,
    folders: starter.folders,
    sets: starter.sets,
    progress: {
      setProgress: {},
      dailyGoal: 20,
    },
    updatedAt: new Date().toISOString(),
  };

  await saveAccount(account);
  const token = await createSession(email);
  return {
    sessionToken: token,
    state: buildClientState(account),
  };
}

export async function loginAccount({ email, password }) {
  const account = await getAccountByEmail(email);
  if (!account || account.passwordHash !== hashPassword(password)) {
    throw new Error("Email or password did not match.");
  }

  const token = await createSession(email);
  return {
    sessionToken: token,
    state: buildClientState(account),
  };
}

export async function loadAccountFromSession(token) {
  const session = await getSession(token);
  if (!session?.email) {
    throw new Error("Your cloud session expired. Please log in again.");
  }

  const account = await getAccountByEmail(session.email);
  if (!account) {
    throw new Error("Your cloud account could not be found.");
  }

  return account;
}

export async function saveAccountStateFromSession(token, payload) {
  const account = await loadAccountFromSession(token);
  const state = sanitizeObject(payload);
  const userId = account.user.id;
  const nextAccount = {
    ...account,
    user: {
      ...account.user,
      name: state.user?.name ? String(state.user.name).trim() : account.user.name,
    },
    folders: sanitizeArray(state.folders).filter((folder) => folder?.userId === userId),
    sets: sanitizeArray(state.sets).filter((setItem) => setItem?.userId === userId),
    progress: sanitizeObject(state.progress),
  };

  await saveAccount(nextAccount);
  return buildClientState(nextAccount);
}
