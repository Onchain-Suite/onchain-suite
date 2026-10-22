import type { NextRequest } from "next/server";

import { isJsonObject } from "@/lib/utils";
import {
  createLabel,
  createThreadWithMessage,
  ensureDefaultLabels,
  getInboxStore,
  inboxEvents,
} from "@/server/inbox-state";

import { hasAnyAuth, requireOrgId } from "../auth";
import { okJson, randomJobId, readJsonSafe } from "../http";
import { clampInt, pickUserKey, sendEmailViaAcs, toInt } from "./helpers";
import { handleThreads } from "./threads";

/** Local inbox routes (`/inbox/*`), backed by `@/server/inbox-state`. */
export const handleInbox = async (
  req: NextRequest,
  path: string[],
  method: string
) => {
  if (path.length === 0 || path[0] !== "inbox") return null;

  const orgId = requireOrgId(req);
  if (!orgId) {
    return okJson(
      req,
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Missing x-org-id header" },
      },
      400
    );
  }

  if (!hasAnyAuth(req)) {
    return okJson(
      req,
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication failed" },
      },
      401
    );
  }

  const userKey = pickUserKey(req);
  const store = getInboxStore(orgId, userKey);
  ensureDefaultLabels(store);

  const sub = path[1] ?? "";
  const nowIso = () => new Date().toISOString();

  const computeUnread = () => {
    let unreadCount = 0;
    for (const t of store.threads.values()) {
      if (t.folder === "TRASH") continue;
      if (t.unreadCount > 0) unreadCount += t.unreadCount;
    }
    return unreadCount;
  };

  if (sub === "labels") {
    if (method === "GET") {
      return okJson(req, { items: Array.from(store.labels.values()) });
    }
    if (method === "POST") {
      const body = await readJsonSafe(req);
      const name =
        isJsonObject(body) && typeof body.name === "string"
          ? body.name.trim()
          : "";
      const color =
        isJsonObject(body) && typeof body.color === "string"
          ? body.color.trim()
          : undefined;
      if (name.length === 0) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "BAD_REQUEST", message: "Missing name" },
          },
          400
        );
      }
      const created = createLabel(store, { name, color });
      return okJson(req, created, 201);
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

  if (sub === "drafts") {
    if (method === "GET") {
      return okJson(req, { items: Array.from(store.drafts.values()) });
    }
    if (method === "POST") {
      const body = await readJsonSafe(req);
      const content =
        isJsonObject(body) && typeof body.content === "string"
          ? body.content
          : "";
      const to =
        isJsonObject(body) && Array.isArray(body.to)
          ? body.to.filter((v: unknown) => typeof v === "string")
          : undefined;
      const subject =
        isJsonObject(body) && typeof body.subject === "string"
          ? body.subject
          : undefined;
      const attachments = isJsonObject(body) ? body.attachments : undefined;

      const id = randomJobId();
      const draft = {
        id,
        to,
        subject,
        content,
        attachments,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      store.drafts.set(id, draft);
      return okJson(req, draft, 201);
    }

    if (method === "PUT" && path.length >= 3) {
      const draftId = path[2] ?? "";
      const existing = store.drafts.get(draftId);
      if (!existing)
        return okJson(
          req,
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Draft not found" },
          },
          404
        );
      const body = await readJsonSafe(req);
      const next = { ...existing };
      if (isJsonObject(body) && Array.isArray(body.to)) {
        next.to = body.to.filter((v: unknown) => typeof v === "string");
      }
      if (isJsonObject(body) && typeof body.subject === "string")
        next.subject = body.subject;
      if (isJsonObject(body) && typeof body.content === "string")
        next.content = body.content;
      if (isJsonObject(body) && "attachments" in body)
        next.attachments = body.attachments;
      next.updatedAt = nowIso();
      store.drafts.set(draftId, next);
      return okJson(req, next);
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

  if (sub === "search" && method === "GET") {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    const limit = clampInt(
      toInt(req.nextUrl.searchParams.get("limit"), 20),
      1,
      200
    );
    const threads: unknown[] = [];
    const messages: unknown[] = [];
    if (q.length > 0) {
      for (const t of store.threads.values()) {
        if (threads.length >= limit) break;
        const hit =
          t.subject.toLowerCase().includes(q) ||
          t.snippet.toLowerCase().includes(q);
        if (hit) threads.push(t);
      }
      for (const m of store.messages.values()) {
        if (messages.length >= limit) break;
        const hit =
          m.subject.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.from.toLowerCase().includes(q);
        if (hit) messages.push(m);
      }
    }
    return okJson(req, { threads, messages });
  }

  if (sub === "messages" && method === "POST") {
    const body = await readJsonSafe(req);
    const subject =
      isJsonObject(body) && typeof body.subject === "string"
        ? body.subject
        : "";
    const content =
      isJsonObject(body) && typeof body.content === "string"
        ? body.content
        : "";
    const fromEmail =
      isJsonObject(body) && typeof body.fromEmail === "string"
        ? body.fromEmail
        : "you@onchainsuite.com";
    const rawTo = isJsonObject(body) ? body.to : null;
    const to =
      typeof rawTo === "string"
        ? [rawTo]
        : Array.isArray(rawTo)
          ? rawTo.filter((v: unknown) => typeof v === "string")
          : [];
    if (
      to.length === 0 ||
      subject.trim().length === 0 ||
      content.trim().length === 0
    ) {
      return okJson(
        req,
        { ok: false, message: "Missing to/subject/content" },
        400
      );
    }

    const { thread, message } = createThreadWithMessage(store, {
      threadId: "",
      from: fromEmail,
      to,
      subject,
      content,
      attachments: isJsonObject(body) ? body.attachments : undefined,
      direction: "outbound",
    });
    thread.folder = "SENT";
    thread.unreadCount = 0;
    thread.updatedAt = nowIso();
    store.threads.set(thread.id, thread);

    inboxEvents.emit("new_message", { orgId, threadId: thread.id, message });
    inboxEvents.emit("thread_updated", { orgId, threadId: thread.id });
    inboxEvents.emit("unread_count_changed", {
      orgId,
      unreadCount: computeUnread(),
    });

    sendEmailViaAcs({ fromEmail, to, subject, content }).catch(() => undefined);

    return okJson(
      req,
      { ok: true, threadId: thread.id, messageId: message.id },
      202
    );
  }

  if (sub === "threads") {
    const threads = await handleThreads({
      req,
      method,
      path,
      store,
      nowIso,
      computeUnread,
      orgId,
      userKey,
    });
    if (threads) return threads;
  }

  return okJson(
    req,
    { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
    404
  );
};
