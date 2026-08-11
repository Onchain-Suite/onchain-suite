import { motion } from "framer-motion";
import React from "react";

import { type InboxThreadDetail, type InboxThreadListItem } from "../types";

interface ThreadProps {
  thread: InboxThreadDetail | InboxThreadListItem;
}

const Thread = ({ thread }: ThreadProps) => {
  const messages =
    "messages" in thread && Array.isArray(thread.messages)
      ? thread.messages
      : [];
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">Loading thread…</div>
        ) : (
          messages.map((message) => {
            const isYou =
              message.direction === "outbound" ||
              message.from.toLowerCase().includes("you");
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex ${isYou ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[80%] gap-2 ${isYou ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      isYou
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {isYou
                      ? "Y"
                      : (thread.from ?? thread.subject ?? "?")
                          .trim()
                          .slice(0, 1)
                          .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        isYou
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-card text-foreground border border-border"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    <p
                      className={`mt-1 text-xs text-muted-foreground ${
                        isYou ? "text-right" : "text-left"
                      }`}
                    >
                      {message.createdAt
                        ? new Date(message.createdAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Thread;
