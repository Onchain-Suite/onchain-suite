"use client";

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";

import "./email-editor.css";
import { selectedParts } from "../../editor/selection";
import { useEmailTiptap } from "../../hooks/use-email-tiptap";
import type { DocNode } from "../../types/email-doc";
import {
  hiddenSections,
  missingRequiredTags,
  recipientTags,
  sectionTags,
} from "../../utils/doc-text";
import { emailBytes, renderEmailHtml } from "../../utils/render-email";
import { AtomPanel } from "../inspector/atom-panel";
import { FooterPanel } from "../inspector/footer-panel";
import { PreviewPanel } from "../inspector/preview-panel";
import { SectionPanel } from "../inspector/section-panel";
import { TextPanel } from "../inspector/text-panel";
import { EmailCanvas } from "./email-canvas";
import { EmailPreview, previewAudiences } from "./email-preview";
import { FormatToolbar, LinkBar } from "./format-toolbar";
import { ImportHtmlDialog, ViewHtmlDialog } from "./html-dialogs";
import { InsertPanel } from "./insert-panel";
import { SuggestionList } from "./suggestion-list";
import { type EditorDevice, type EditorMode, TopBar } from "./top-bar";

export interface EmailEditorProps {
  name: string;
  /** The body to start from: a document, or HTML when only HTML was saved. */
  initialBody: DocNode | { html: string };
  initialFooter: string;
  preheader?: string;
  orgId?: string;
  backLabel?: string;
  saveLabel: string;
  saveFailed?: boolean;
  doneLabel?: string;
  doneBusy?: boolean;
  /** Every edit to the body or footer; the caller saves. */
  onChange: (doc: DocNode, footer: string) => void;
  onBack: () => void;
  onDone: () => void;
}

/*
 * The email editor, on Tiptap (ProseMirror). A document you type into:
 * markdown shortcuts, "/" for any block, "{{" for a merge tag, paste from
 * Google Docs with the formatting intact, drag images in. Preview shows the
 * actual inbox HTML (utils/render-email.ts), so personalisation and tag
 * sections can be checked before a send.
 */
export function EmailEditor(props: EmailEditorProps) {
  const { name, preheader = "", orgId, onChange } = props;
  const [doc, setDoc] = useState<DocNode | null>(() =>
    "html" in props.initialBody ? null : props.initialBody
  );
  const [footer, setFooterState] = useState(props.initialFooter);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [device, setDevice] = useState<EditorDevice>("desktop");
  const [dark, setDark] = useState(false);
  const [audienceValue, setAudienceValue] = useState("");
  const [footerSel, setFooterSel] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"import" | "html" | null>(null);

  const footerRef = useRef(footer);
  const docRef = useRef(doc);
  const onBodyChange = useCallback(
    (d: DocNode) => {
      docRef.current = d;
      setDoc(d);
      onChange(d, footerRef.current);
    },
    [onChange]
  );
  const setFooter = (f: string) => {
    footerRef.current = f;
    setFooterState(f);
    if (docRef.current) onChange(docRef.current, f);
  };

  const openLinkRef = useRef<() => void>(() => {});
  const { editor, menu } = useEmailTiptap({
    initial: props.initialBody,
    orgId,
    onChange: onBodyChange,
    onReady: (d) => {
      docRef.current = d;
      setDoc(d);
    },
    onFocus: () => setFooterSel(false),
    onOpenLink: () => openLinkRef.current(),
  });
  openLinkRef.current = () => {
    if (editor) setLink(String(editor.getAttributes("link").href ?? ""));
  };

  /* What will be sent. Deferred, so a long email never makes typing lag. */
  const body = useDeferredValue(doc);
  const emptyDoc = useMemo<DocNode>(() => ({ type: "doc", content: [] }), []);
  const current = body ?? emptyDoc;
  const sendHtml = useMemo(
    () => renderEmailHtml(current, { footer, mode: "send" }),
    [current, footer]
  );
  const bytes = useMemo(() => emailBytes(sendHtml), [sendHtml]);
  const missing = useMemo(
    () => missingRequiredTags(current, footer),
    [current, footer]
  );
  const fallbacks = useMemo(() => recipientTags(current), [current]);
  const audiences = useMemo(
    () => previewAudiences(sectionTags(current)),
    [current]
  );
  const audience =
    audiences.find((a) => a.value === audienceValue) ?? audiences[0];
  const previewHtml = useMemo(
    () =>
      mode === "preview"
        ? renderEmailHtml(current, {
            footer,
            mode: "preview",
            preheader,
            contactTags: audience.tags,
            dark,
          })
        : "",
    [mode, current, footer, preheader, audience.tags, dark]
  );
  const hidden = useMemo(
    () => hiddenSections(current, audience.tags),
    [current, audience.tags]
  );

  /* A fallback belongs to the tag, not one place it appears: change it once, it changes everywhere. */
  const setFallback = (key: string, fallback: string) => {
    if (!editor) return;
    const { tr } = editor.state;
    editor.state.doc.descendants((n, pos) => {
      if (n.type.name === "mergeTag" && n.attrs.key === key)
        tr.setNodeMarkup(pos, undefined, { ...n.attrs, fallback });
    });
    editor.view.dispatch(tr);
  };

  const { atom, section } = selectedParts(editor?.state);
  const panel = footerSel
    ? "footer"
    : atom
      ? "atom"
      : section
        ? "section"
        : "text";
  const setSection = (attrs: Record<string, unknown>) => {
    if (!section || !editor) return;
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(section.pos, undefined, {
        ...section.node.attrs,
        ...attrs,
      })
    );
  };
  const unwrapSection = () => {
    if (!section || !editor) return;
    editor.view.dispatch(
      editor.state.tr.replaceWith(
        section.pos,
        section.pos + section.node.nodeSize,
        section.node.content
      )
    );
  };

  const onMode = useCallback((m: EditorMode) => {
    setMode(m);
    if (m === "preview") setFooterSel(false);
  }, []);
  const onDark = useCallback(() => setDark((v) => !v), []);
  const onImport = useCallback(() => setDialog("import"), []);
  const onViewHtml = useCallback(() => setDialog("html"), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const done = useMemo(
    () => ({ busy: !!props.doneBusy, label: props.doneLabel ?? "Done" }),
    [props.doneBusy, props.doneLabel]
  );

  return (
    <div className="eed" aria-label="Email editor">
      <TopBar
        name={name}
        backLabel={props.backLabel ?? "Back to campaign"}
        saveLabel={props.saveLabel}
        saveFailed={!!props.saveFailed}
        mode={mode}
        device={device}
        dark={dark}
        bytes={bytes}
        missing={missing}
        done={done}
        onBack={props.onBack}
        onMode={onMode}
        onDevice={setDevice}
        onDark={onDark}
        onImport={onImport}
        onViewHtml={onViewHtml}
        onDone={props.onDone}
      />

      <div className="eed-body">
        <InsertPanel editor={editor} disabled={mode !== "edit"} />

        <div className="eed-center">
          {!editor ? (
            <div className="eed-canvas" aria-busy="true" />
          ) : mode === "edit" ? (
            <>
              <FormatToolbar editor={editor} onOpenLink={openLinkRef.current} />
              {link !== null && (
                <LinkBar
                  editor={editor}
                  draft={link}
                  onDraft={setLink}
                  onClose={() => setLink(null)}
                />
              )}
              <EmailCanvas
                editor={editor}
                device={device}
                footer={footer}
                footerSelected={footerSel}
                onSelectFooter={() => setFooterSel(true)}
              />
            </>
          ) : (
            <EmailPreview
              html={previewHtml}
              device={device}
              audiences={audiences}
              audience={audience}
              hiddenSections={hidden}
              onAudience={setAudienceValue}
            />
          )}
        </div>

        <aside className="eed-right" aria-label="Selected block">
          {mode === "preview" && (
            <PreviewPanel
              who={
                audience.tags
                  ? audience.label.toLowerCase()
                  : "a recipient with sample values"
              }
              dark={dark}
              fallbacks={fallbacks}
              onFallback={setFallback}
              onEdit={() => setMode("edit")}
            />
          )}
          {mode === "edit" && panel === "footer" && (
            <FooterPanel
              footer={footer}
              missing={missing}
              onChange={setFooter}
            />
          )}
          {mode === "edit" && panel === "atom" && atom && editor && (
            <AtomPanel
              editor={editor}
              node={atom.node}
              pos={atom.pos}
              orgId={orgId}
            />
          )}
          {mode === "edit" && panel === "section" && section && (
            <SectionPanel
              tag={String(section.node.attrs.tag ?? "")}
              mode={section.node.attrs.mode === "except" ? "except" : "only"}
              orgId={orgId}
              onChange={setSection}
              onUnwrap={unwrapSection}
            />
          )}
          {mode === "edit" && panel === "text" && editor && (
            <TextPanel editor={editor} />
          )}
        </aside>
      </div>

      {menu && <SuggestionList menu={menu} />}
      {editor && (
        <ImportHtmlDialog
          editor={editor}
          open={dialog === "import"}
          onClose={closeDialog}
        />
      )}
      <ViewHtmlDialog
        name={name}
        html={sendHtml}
        open={dialog === "html"}
        onClose={closeDialog}
      />
    </div>
  );
}
