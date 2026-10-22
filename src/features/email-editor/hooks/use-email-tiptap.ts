"use client";

import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import type { EditorView } from "@tiptap/pm/view";
import { type Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { assetsService } from "../assets.service";
import { BLOCKS } from "../editor/blocks";
import {
  Column,
  Columns,
  EmailButton,
  EmailImage,
  HtmlBlock,
  type MenuState,
  MergeTag,
  slashMenu,
  SocialLinks,
  Spacer,
  tagMenu,
  TagSection,
} from "../editor/extensions";
import { altFromName, isImageFile, shrinkImage } from "../editor/image-file";
import type { DocNode } from "../types/email-doc";
import { cleanGoogleDocsHtml, sanitizeEmailHtml } from "../utils/email-safety";

const SlashMenu = slashMenu(BLOCKS);

/** Uploads an image and returns its hosted URL; a toast tracks it. Null if it failed. */
export async function uploadImage(
  file: File,
  orgId?: string
): Promise<string | null> {
  const id = toast.loading("Uploading image…");
  try {
    const { file: small, resized } = await shrinkImage(file);
    const { url } = await assetsService.upload(small, { orgId });
    toast.success(
      resized
        ? "Image resized to fit the email and uploaded"
        : "Image uploaded",
      { id }
    );
    return url;
  } catch (err) {
    toast.error(
      err instanceof Error
        ? `Couldn't upload the image. ${err.message}`
        : "Couldn't upload the image",
      { id }
    );
    return null;
  }
}

/* Images dropped or pasted go up to /assets first: inboxes block data: images,
   so the email only ever points at a hosted URL. */
function insertUploaded(
  view: EditorView,
  file: File,
  at: number | null,
  orgId?: string
) {
  uploadImage(file, orgId).then((src) => {
    if (!src || view.isDestroyed) return;
    const node = view.state.schema.nodes.emailImage.create({
      src,
      alt: altFromName(file.name),
      caption: "",
      href: "",
    });
    const tr =
      at === null
        ? view.state.tr.replaceSelectionWith(node)
        : view.state.tr.insert(Math.min(at, view.state.doc.content.size), node);
    view.dispatch(tr);
  });
}

export interface EmailTiptapOptions {
  /** A document, or HTML to parse when only HTML was saved. */
  initial: DocNode | { html: string };
  orgId?: string;
  onChange: (doc: DocNode) => void;
  /** The document once the editor exists, which for HTML is its parse. Not an edit. */
  onReady?: (doc: DocNode) => void;
  onFocus?: () => void;
  onOpenLink: () => void;
}

/**
 * The Tiptap editor behind the email body, with the email nodes, markdown
 * shortcuts, the "/" and "{{" menus, Google Docs paste cleanup and image
 * upload on drop or paste. The open menu is returned as state for the list.
 */
export function useEmailTiptap({
  initial,
  orgId,
  onChange,
  onReady,
  onFocus,
  onOpenLink,
}: EmailTiptapOptions): {
  editor: Editor | null;
  menu: MenuState | null;
} {
  const [menu, setMenu] = useState<MenuState | null>(null);
  // Handlers read the latest props without re-creating the editor.
  const latest = useRef({ onChange, onReady, onFocus, onOpenLink, orgId });
  latest.current = { onChange, onReady, onFocus, onOpenLink, orgId };

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading"
            ? "Heading"
            : "Type / for blocks, {{ for merge tags",
      }),
      MergeTag,
      EmailButton,
      EmailImage,
      Spacer,
      SocialLinks,
      HtmlBlock,
      Column,
      Columns,
      TagSection,
      SlashMenu.configure({ onState: setMenu }),
      tagMenu.configure({ onState: setMenu }),
    ],
    content: "html" in initial ? sanitizeEmailHtml(initial.html).html : initial,
    onCreate: ({ editor: e }) =>
      latest.current.onReady?.(e.getJSON() as DocNode),
    onUpdate: ({ editor: e }) =>
      latest.current.onChange(e.getJSON() as DocNode),
    onFocus: () => latest.current.onFocus?.(),
    editorProps: {
      attributes: { class: "eed-doc", "aria-label": "Email body" },
      transformPastedHTML: cleanGoogleDocsHtml,
      handleKeyDown: (_view, e) => {
        if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          latest.current.onOpenLink();
          return true;
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        const file = moved
          ? undefined
          : Array.from(event.dataTransfer?.files ?? []).find(isImageFile);
        if (!file) return false;
        event.preventDefault();
        const pos =
          view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
          view.state.selection.from;
        insertUploaded(view, file, pos, latest.current.orgId);
        return true;
      },
      handlePaste: (view, event) => {
        const file = Array.from(event.clipboardData?.files ?? []).find(
          isImageFile
        );
        if (!file) return false;
        insertUploaded(view, file, null, latest.current.orgId);
        return true;
      },
    },
  });

  return { editor, menu };
}
