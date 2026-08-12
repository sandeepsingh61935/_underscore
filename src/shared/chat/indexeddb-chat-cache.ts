/**
 * IndexedDB cache for grounded chat (ADR-028).
 * Snappy list/open; never source of truth for signed-in users.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { ChatMessage, ChatThread } from './types';

const DB_NAME = 'underscore-chat-cache';
const DB_VERSION = 1;
const THREADS_STORE = 'threads';
const MESSAGES_STORE = 'messages';

interface ChatCacheSchema extends DBSchema {
  [THREADS_STORE]: {
    key: string;
    value: ChatThread & { _userId: string };
    indexes: { byUserUpdated: [string, string] };
  };
  [MESSAGES_STORE]: {
    key: string;
    value: ChatMessage & { _userId: string };
    indexes: {
      byThreadCreated: [string, string];
      byUser: string;
    };
  };
}

export interface IChatCache {
  listThreads(userId: string): Promise<ChatThread[]>;
  putThread(thread: ChatThread): Promise<void>;
  putThreads(userId: string, threads: ChatThread[]): Promise<void>;
  deleteThread(userId: string, threadId: string): Promise<void>;
  listMessages(userId: string, threadId: string): Promise<ChatMessage[]>;
  putMessage(message: ChatMessage): Promise<void>;
  putMessages(userId: string, threadId: string, messages: ChatMessage[]): Promise<void>;
  clearUser(userId: string): Promise<void>;
}

function stripThread(t: ChatThread & { _userId?: string }): ChatThread {
  const { _userId: _, ...rest } = t as ChatThread & { _userId?: string };
  return rest;
}

function stripMessage(m: ChatMessage & { _userId?: string }): ChatMessage {
  const { _userId: _, ...rest } = m as ChatMessage & { _userId?: string };
  return rest;
}

export class IndexedDbChatCache implements IChatCache {
  private dbPromise: Promise<IDBPDatabase<ChatCacheSchema>>;

  constructor(dbName: string = DB_NAME) {
    this.dbPromise = openDB<ChatCacheSchema>(dbName, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(THREADS_STORE)) {
          const threads = db.createObjectStore(THREADS_STORE, { keyPath: 'id' });
          threads.createIndex('byUserUpdated', ['_userId', 'updatedAt']);
        }
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messages = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          messages.createIndex('byThreadCreated', ['threadId', 'createdAt']);
          messages.createIndex('byUser', '_userId');
        }
      },
    });
  }

  async listThreads(userId: string): Promise<ChatThread[]> {
    const db = await this.dbPromise;
    const all = await db.getAll(THREADS_STORE);
    return all
      .filter((t) => t._userId === userId)
      .map(stripThread)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  }

  async putThread(thread: ChatThread): Promise<void> {
    const db = await this.dbPromise;
    await db.put(THREADS_STORE, { ...thread, _userId: thread.userId });
  }

  async putThreads(userId: string, threads: ChatThread[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(THREADS_STORE, 'readwrite');
    const existing = await tx.store.getAll();
    for (const t of existing) {
      if (t._userId === userId) {
        await tx.store.delete(t.id);
      }
    }
    for (const thread of threads) {
      await tx.store.put({ ...thread, _userId: userId });
    }
    await tx.done;
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    const db = await this.dbPromise;
    const thread = await db.get(THREADS_STORE, threadId);
    if (thread && thread._userId === userId) {
      await db.delete(THREADS_STORE, threadId);
    }
    const tx = db.transaction(MESSAGES_STORE, 'readwrite');
    const all = await tx.store.getAll();
    for (const m of all) {
      if (m._userId === userId && m.threadId === threadId) {
        await tx.store.delete(m.id);
      }
    }
    await tx.done;
  }

  async listMessages(userId: string, threadId: string): Promise<ChatMessage[]> {
    const db = await this.dbPromise;
    const all = await db.getAll(MESSAGES_STORE);
    return all
      .filter((m) => m._userId === userId && m.threadId === threadId)
      .map(stripMessage)
      .sort((a, b) =>
        a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
      );
  }

  async putMessage(message: ChatMessage): Promise<void> {
    const db = await this.dbPromise;
    await db.put(MESSAGES_STORE, { ...message, _userId: message.userId });
  }

  async putMessages(
    userId: string,
    threadId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(MESSAGES_STORE, 'readwrite');
    const existing = await tx.store.getAll();
    for (const m of existing) {
      if (m._userId === userId && m.threadId === threadId) {
        await tx.store.delete(m.id);
      }
    }
    for (const message of messages) {
      await tx.store.put({ ...message, _userId: userId });
    }
    await tx.done;
  }

  async clearUser(userId: string): Promise<void> {
    const db = await this.dbPromise;
    const ttx = db.transaction(THREADS_STORE, 'readwrite');
    for (const t of await ttx.store.getAll()) {
      if (t._userId === userId) await ttx.store.delete(t.id);
    }
    await ttx.done;
    const mtx = db.transaction(MESSAGES_STORE, 'readwrite');
    for (const m of await mtx.store.getAll()) {
      if (m._userId === userId) await mtx.store.delete(m.id);
    }
    await mtx.done;
  }
}

/** In-memory cache for tests / environments without IndexedDB. */
export class MemoryChatCache implements IChatCache {
  private threads = new Map<string, ChatThread>();
  private messages = new Map<string, ChatMessage>();

  async listThreads(userId: string): Promise<ChatThread[]> {
    return [...this.threads.values()]
      .filter((t) => t.userId === userId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async putThread(thread: ChatThread): Promise<void> {
    this.threads.set(thread.id, thread);
  }

  async putThreads(userId: string, threads: ChatThread[]): Promise<void> {
    for (const [id, t] of this.threads) {
      if (t.userId === userId) this.threads.delete(id);
    }
    for (const t of threads) this.threads.set(t.id, t);
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    const t = this.threads.get(threadId);
    if (t?.userId === userId) this.threads.delete(threadId);
    for (const [id, m] of this.messages) {
      if (m.userId === userId && m.threadId === threadId) this.messages.delete(id);
    }
  }

  async listMessages(userId: string, threadId: string): Promise<ChatMessage[]> {
    return [...this.messages.values()]
      .filter((m) => m.userId === userId && m.threadId === threadId)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async putMessage(message: ChatMessage): Promise<void> {
    this.messages.set(message.id, message);
  }

  async putMessages(
    userId: string,
    threadId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    for (const [id, m] of this.messages) {
      if (m.userId === userId && m.threadId === threadId) this.messages.delete(id);
    }
    for (const m of messages) this.messages.set(m.id, m);
  }

  async clearUser(userId: string): Promise<void> {
    for (const [id, t] of this.threads) {
      if (t.userId === userId) this.threads.delete(id);
    }
    for (const [id, m] of this.messages) {
      if (m.userId === userId) this.messages.delete(id);
    }
  }
}
