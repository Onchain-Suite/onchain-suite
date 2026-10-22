import { isJsonObject } from "@/lib/utils";
import { appendMessageToThread, inboxEvents } from "@/server/inbox-state";

import { okJson, readJsonSafe } from "../http";
import type { InboxContext } from "./context";
import { clampInt, sendEmailViaAcs, toBool, toFolder, toInt } from "./helpers";

/** `/inbox/threads/*`. Returns null for an unmatched route. */
export async function handleThreads({
  req,
  method,
  path,
  store,
  nowIso,
  computeUnread,
  orgId,
}: InboxContext) {
  if (method === "GET" && path.length === 3 && path[2] === "unread-count") {
    return okJson(req, { unreadCount: computeUnread() });
  }

  if (method === "GET" && path.length === 2) {
    const folder = toFolder(req.nextUrl.searchParams.get("folder")) ?? "INBOX";
    const unread = toBool(req.nextUrl.searchParams.get("unread"));
    const starred = toBool(req.nextUrl.searchParams.get("starred"));
    const labelId = (req.nextUrl.searchParams.get("labelId") ?? "").trim();
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    const page = toInt(req.nextUrl.searchParams.get("page"), 1);
    const limit = clampInt(
      toInt(req.nextUrl.searchParams.get("limit"), 50),
      1,
      200
    );

    const all = Array.from(store.threads.values())
      .filter((t) => t.folder === folder)
      .filter((t) =>
        unread === null
          ? true
          : unread
            ? t.unreadCount > 0
            : t.unreadCount === 0
      )
      .filter((t) => (starred === null ? true : t.starred === starred))
      .filter((t) => (labelId ? t.labelIds.includes(labelId) : true))
      .filter((t) => {
        if (q.length === 0) return true;
        if (
          t.subject.toLowerCase().includes(q) ||
          t.snippet.toLowerCase().includes(q)
        )
          return true;
        for (const mid of t.messageIds) {
          const m = store.messages.get(mid);
          if (!m) continue;
          if (m.content.toLowerCase().includes(q)) return true;
        }
        return false;
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = clampInt(page, 1, totalPages);
    const start = (safePage - 1) * limit;
    const items = all.slice(start, start + limit).map((t) => {
      const labels = t.labelIds
        .map((id) => store.labels.get(id))
        .filter((x): x is NonNullable<typeof x> => !!x);
      const lastMessageId = t.messageIds[t.messageIds.length - 1] ?? "";
      const lastMessage = lastMessageId
        ? store.messages.get(lastMessageId)
        : null;
      const from =
        lastMessage?.direction === "inbound"
          ? lastMessage.from
          : (lastMessage?.to?.[0] ?? lastMessage?.from ?? "");
      const fromEmail =
        lastMessage?.direction === "inbound" ? lastMessage.from : "";
      const hasAttachment = !!lastMessage?.attachments;
      return { ...t, labels, from, fromEmail, hasAttachment };
    });

    return okJson(req, {
      items,
      meta: {
        totalItems,
        totalPages,
        page: safePage,
        limit,
        hasPreviousPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    });
  }

  if (path.length >= 3) {
    const threadId = path[2] ?? "";
    const thread = store.threads.get(threadId);
    if (!thread) {
      return okJson(
        req,
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Thread not found" },
        },
        404
      );
    }

    if (method === "GET" && path.length === 3) {
      const messages = thread.messageIds
        .slice(-200)
        .map((id) => store.messages.get(id))
        .filter((m): m is NonNullable<typeof m> => !!m);
      const labels = thread.labelIds
        .map((id) => store.labels.get(id))
        .filter((l): l is NonNullable<typeof l> => !!l);
      return okJson(req, { ...thread, labels, messages });
    }

    if (method === "GET" && path.length === 4 && path[3] === "messages") {
      const cursor = (req.nextUrl.searchParams.get("cursor") ?? "").trim();
      const limit = clampInt(
        toInt(req.nextUrl.searchParams.get("limit"), 50),
        1,
        200
      );
      const ids = thread.messageIds;
      const startIdx = cursor
        ? Math.max(0, ids.indexOf(cursor) + 1)
        : Math.max(0, ids.length - limit);
      const slice = ids.slice(startIdx, startIdx + limit);
      const items = slice
        .map((id) => store.messages.get(id))
        .filter((m): m is NonNullable<typeof m> => !!m);
      const nextCursor =
        startIdx + limit < ids.length
          ? (slice[slice.length - 1] ?? null)
          : null;
      return okJson(req, { items, nextCursor });
    }

    if (method === "POST" && path.length === 4 && path[3] === "messages") {
      const body = await readJsonSafe(req);
      const content =
        isJsonObject(body) && typeof body.content === "string"
          ? body.content
          : "";
      const fromEmail =
        isJsonObject(body) && typeof body.fromEmail === "string"
          ? body.fromEmail
          : "you@onchainsuite.com";
      const explicitTo =
        isJsonObject(body) && typeof body.to === "string" ? body.to.trim() : "";
      const toFallback = (() => {
        const ids = [...thread.messageIds].reverse();
        for (const id of ids) {
          const m = store.messages.get(id);
          if (!m) continue;
          if (m.direction === "inbound") return m.from;
        }
        return "";
      })();
      const to = (explicitTo || toFallback).trim();
      if (content.trim().length === 0) {
        return okJson(req, { ok: false, message: "Missing content" }, 400);
      }
      if (to.length === 0) {
        return okJson(req, { ok: false, message: "Missing recipient" }, 400);
      }

      const next = appendMessageToThread(store, threadId, {
        from: fromEmail,
        to: [to],
        subject: thread.subject,
        content,
        attachments: isJsonObject(body) ? body.attachments : undefined,
        direction: "outbound",
      });
      if (!next)
        return okJson(req, { ok: false, message: "Thread not found" }, 404);

      inboxEvents.emit("new_message", {
        orgId,
        threadId,
        message: next.message,
      });
      inboxEvents.emit("thread_updated", { orgId, threadId });
      inboxEvents.emit("unread_count_changed", {
        orgId,
        unreadCount: computeUnread(),
      });

      sendEmailViaAcs({
        fromEmail,
        to: [to],
        subject: thread.subject,
        content,
      }).catch(() => undefined);

      return okJson(req, { ok: true, messageId: next.message.id }, 202);
    }

    if (method === "PUT" && path.length === 4 && path[3] === "read") {
      thread.unreadCount = 0;
      thread.updatedAt = nowIso();
      store.threads.set(threadId, thread);
      inboxEvents.emit("thread_updated", {
        orgId,
        threadId,
        patch: { unreadCount: 0 },
      });
      inboxEvents.emit("unread_count_changed", {
        orgId,
        unreadCount: computeUnread(),
      });
      return okJson(req, { ok: true });
    }

    if (method === "PUT" && path.length === 4 && path[3] === "unread") {
      thread.unreadCount = thread.unreadCount > 0 ? thread.unreadCount : 1;
      thread.updatedAt = nowIso();
      store.threads.set(threadId, thread);
      inboxEvents.emit("thread_updated", {
        orgId,
        threadId,
        patch: { unreadCount: thread.unreadCount },
      });
      inboxEvents.emit("unread_count_changed", {
        orgId,
        unreadCount: computeUnread(),
      });
      return okJson(req, { ok: true });
    }

    if (method === "PUT" && path.length === 4 && path[3] === "star") {
      const body = await readJsonSafe(req);
      const provided =
        isJsonObject(body) && typeof body.starred === "boolean"
          ? body.starred
          : null;
      thread.starred = provided ?? !thread.starred;
      thread.updatedAt = nowIso();
      store.threads.set(threadId, thread);
      inboxEvents.emit("thread_updated", {
        orgId,
        threadId,
        patch: { starred: thread.starred },
      });
      return okJson(req, { ok: true, starred: thread.starred });
    }

    if (method === "PUT" && path.length === 4 && path[3] === "label") {
      const body = await readJsonSafe(req);
      const add =
        isJsonObject(body) && Array.isArray(body.add)
          ? body.add.filter((v: unknown) => typeof v === "string")
          : [];
      const remove =
        isJsonObject(body) && Array.isArray(body.remove)
          ? body.remove.filter((v: unknown) => typeof v === "string")
          : [];
      const set = new Set(thread.labelIds);
      add.forEach((id: string) => set.add(id));
      remove.forEach((id: string) => set.delete(id));
      thread.labelIds = Array.from(set);
      thread.updatedAt = nowIso();
      store.threads.set(threadId, thread);
      const labels = thread.labelIds
        .map((id) => store.labels.get(id))
        .filter((l): l is NonNullable<typeof l> => !!l);
      inboxEvents.emit("thread_updated", {
        orgId,
        threadId,
        patch: { labelIds: thread.labelIds },
      });
      return okJson(req, { ok: true, labels });
    }

    return okJson(
      req,
      {
        success: false,
        error: { code: "METHOD_NOT_ALLOWED", message: "Not supported" },
      },
      405
    );
  }

  return null;
}
