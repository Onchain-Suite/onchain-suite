"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { CampaignFormData } from "../validations";
import { X_THREAD_MAX, xPosts, xPostsCost } from "./x-content";

const POST_LIMIT = 280;

/**
 * A post, or a thread of up to 25 posted as a reply chain. Shows what X bills
 * the client's app for it, because a post with a link costs about 13 times one
 * without.
 */
export function XThreadEditor({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const first = form.watch("xText") ?? "";
  const rest = form.watch("xThreadRest") ?? [];
  const posts = [first, ...rest];
  const nonEmpty = xPosts({ xText: first, xThreadRest: rest });
  const cost = xPostsCost(nonEmpty);

  const setPost = (index: number, value: string) => {
    if (index === 0) {
      form.setValue("xText", value, { shouldDirty: true });
      return;
    }
    const next = [...rest];
    next[index - 1] = value;
    form.setValue("xThreadRest", next, { shouldDirty: true });
  };
  const addPost = () =>
    form.setValue("xThreadRest", [...rest, ""], { shouldDirty: true });
  const dropPost = (index: number) =>
    form.setValue(
      "xThreadRest",
      rest.filter((_, k) => k !== index - 1),
      { shouldDirty: true }
    );

  const costLine =
    nonEmpty.length > 0
      ? `X bills your X app about $${cost.toFixed(3)} for ${
          nonEmpty.length === 1 ? "this post" : `these ${nonEmpty.length} posts`
        }. A post with a link costs $0.20, one without $0.015.`
      : "X bills your X app $0.015 a post, $0.20 if it has a link.";

  return (
    <div className="space-y-3">
      {posts.map((value, index) => {
        const over = value.length > POST_LIMIT;
        return (
          // Posts have no id, and every field is controlled from the form, so
          // the position is the identity.
          // eslint-disable-next-line react/no-array-index-key
          <div key={index} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`x-post-${index}`}>
                {posts.length > 1
                  ? `Post ${index + 1} of ${posts.length}`
                  : "Post"}
              </Label>
              {index > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => dropPost(index)}
                  aria-label={`Remove post ${index + 1}`}
                >
                  <XMarkIcon aria-hidden="true" className="size-4" />
                </Button>
              ) : null}
            </div>
            <Textarea
              id={`x-post-${index}`}
              rows={index === 0 ? 5 : 3}
              placeholder={
                index === 0 ? "What's happening?" : "Next post in the thread…"
              }
              value={value}
              onChange={(e) => setPost(index, e.target.value)}
            />
            <p
              className={
                over
                  ? "text-xs text-red-600 dark:text-red-400"
                  : "text-xs text-muted-foreground"
              }
            >
              {value.length} / {POST_LIMIT} characters
              {over ? " - over the limit" : ""}
            </p>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={posts.length >= X_THREAD_MAX}
          onClick={addPost}
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          Add to thread
        </Button>
        <p className="text-xs tabular-nums text-muted-foreground">{costLine}</p>
      </div>
    </div>
  );
}
