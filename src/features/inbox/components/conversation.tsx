"use client";

import { Mail01Icon } from "@hugeicons/core-free-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { inboxService } from "../inbox.service";
import { type InboxThreadDetail, type InboxThreadListItem } from "../types";
import ConversationHeader from "./conversation-header";
import ReplyComposer from "./reply-composer";
import Thread from "./thread";
import { EmptyState } from "@/shared/components/common/empty-state";

interface ConversationProps {
  selectedThreadId: string | null;
  selectedThread: InboxThreadDetail | InboxThreadListItem | null;
}

const Conversation = ({
  selectedThreadId,
  selectedThread,
}: ConversationProps) => {
  const [replyText, setReplyText] = useState("");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const queryClient = useQueryClient();

  const generateAIReply = () => {
    // Mock AI reply generation
    setIsGeneratingReply(true);
    setTimeout(() => {
      setReplyText(
        "Hi there, thanks for reaching out! I'd love to discuss this further. Let's schedule a call."
      );
      setIsGeneratingReply(false);
    }, 1500);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThreadId) throw new Error("No thread selected");
      const content = replyText.trim();
      if (content.length === 0) throw new Error("Reply is empty");
      return inboxService.sendReply(selectedThreadId, { content });
    },
    onSuccess: async () => {
      setReplyText("");
      await queryClient.invalidateQueries({ queryKey: ["inbox", "thread"] });
      await queryClient.invalidateQueries({ queryKey: ["inbox", "threads"] });
      await queryClient.invalidateQueries({
        queryKey: ["inbox", "unread-count"],
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to send reply";
      toast.error(message);
    },
  });

  if (!selectedThreadId || !selectedThread) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <EmptyState
          icon={Mail01Icon}
          title="No thread open"
          description="Pick a reply on the left to read the thread and answer it."
        />
      </div>
    );
  }

  return (
    <motion.div
      key={selectedThreadId}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <ConversationHeader thread={selectedThread} />
      <Thread thread={selectedThread} />
      <ReplyComposer
        replyText={replyText}
        setReplyText={setReplyText}
        generateAIReply={generateAIReply}
        isGeneratingReply={isGeneratingReply}
        onSend={() => sendMutation.mutate()}
        isSending={sendMutation.isPending}
      />
    </motion.div>
  );
};

export default Conversation;
