"use client";

import {
  ChevronRightIcon,
  CodeBracketIcon,
  EyeIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import {
  type ComponentType,
  type SVGProps,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { PropertySelect, type PropertySelectOption } from "../property-select";
import { Field, TextField } from "./panel-ui";
import { PasteHtmlDialog } from "./paste-html-dialog";
import { PickField } from "./pick-field";

/** How the email is made. Kept on the step so the panel reopens on the same card. */
export type EmailSource = "write" | "saved" | "html";

export interface EmailStepValues {
  source: EmailSource | "";
  templateId: string;
  templateName: string;
  subject: string;
  previewText: string;
  /** Pasted HTML: the runtime sends `body` when there is no template. */
  body: string;
  sender: string;
}

export type EmailStepPatch = {
  emailSource?: EmailSource | "";
  subject?: string;
  previewText?: string;
  body?: string;
  templateId?: string;
  templateName?: string;
};

const CHOICES: {
  v: EmailSource;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  sub: string;
}[] = [
  {
    v: "write",
    icon: PencilSquareIcon,
    label: "Write it here",
    sub: "Design it in the email editor",
  },
  {
    v: "saved",
    icon: Square3Stack3DIcon,
    label: "Use a saved email",
    sub: "One you already made",
  },
  {
    v: "html",
    icon: CodeBracketIcon,
    label: "Paste HTML",
    sub: "Designed somewhere else",
  },
];

const kb = (s: string) =>
  `${Math.max(1, Math.round(new TextEncoder().encode(s).length / 1024))} KB`;

/** A 600px email drawn at the panel's width: a picture, nothing in it runs. */
function EmailThumb({ html, onOpen }: { html: string; onOpen: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);
  useLayoutEffect(() => {
    const w = box.current?.clientWidth;
    if (w) setScale(w / 600);
  }, []);
  return (
    <div className="abp-thumb" ref={box}>
      <iframe
        title="Pasted email"
        tabIndex={-1}
        aria-hidden="true"
        sandbox=""
        srcDoc={html}
        style={{ transform: `scale(${scale})` }}
      />
      <button type="button" className="abp-thumb__open" onClick={onOpen}>
        <span>
          <EyeIcon aria-hidden="true" className="h-3.5 w-3.5" />
          Preview
        </span>
      </button>
    </div>
  );
}

/** Where a step's email is currently coming from, for a step saved before `emailSource`. */
export function emailSourceOf(
  v: Pick<EmailStepValues, "source" | "templateId" | "body">
): EmailSource | "" {
  if (v.source) return v.source;
  if (v.templateId) return "saved";
  if (v.body.trim()) return "html";
  return "";
}

/**
 * Send an email, after the reference: subject and preview text, then the
 * email itself, made one of three ways, then who it is sent as.
 *
 * All three ways end in what the runtime reads: written in the editor or
 * picked from saved emails, it is a `templateId`; pasted, it is the `body`.
 */
export function EmailStepFields({
  values,
  templateOptions,
  senderOptions,
  sendersLoading,
  noVerifiedSender,
  opening,
  onTemplate,
  onChange,
  onSender,
  onOpenBuilder,
}: {
  values: EmailStepValues;
  templateOptions: PropertySelectOption[];
  senderOptions: PropertySelectOption[];
  sendersLoading: boolean;
  noVerifiedSender: boolean;
  opening: boolean;
  onTemplate: (templateId: string) => void;
  onChange: (patch: EmailStepPatch) => void;
  onSender: (email: string) => void;
  onOpenBuilder: () => void;
}) {
  const [pasting, setPasting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const source = emailSourceOf(values);

  const choose = (v: EmailSource) => {
    onChange({ emailSource: v });
    if (v === "write") onOpenBuilder();
    if (v === "html" && !values.body.trim()) setPasting(true);
  };
  const change = (
    <button
      type="button"
      className="abp-link"
      onClick={() => onChange({ emailSource: "" })}
    >
      Change
    </button>
  );

  let email: React.ReactNode;
  if (!source) {
    email = (
      <Field label="The email">
        <div
          className="abp-choices"
          role="group"
          aria-label="How to make the email"
        >
          {CHOICES.map((c) => (
            <button
              key={c.v}
              type="button"
              className="abp-choice"
              onClick={() => choose(c.v)}
            >
              <span className="abp-choice__ic">
                <c.icon aria-hidden="true" />
              </span>
              <span className="abp-choice__txt">
                <b>{c.label}</b>
                <i>{c.sub}</i>
              </span>
              <ChevronRightIcon aria-hidden="true" className="abp-choice__go" />
            </button>
          ))}
        </div>
      </Field>
    );
  } else if (source === "saved") {
    email = (
      <Field label="The email" action={change}>
        <div className="abp-mail">
          <div className="abp-mail__row">
            <span className="abp-mail__ic">
              <Square3Stack3DIcon aria-hidden="true" />
            </span>
            <span className="abp-mail__meta">
              <b>Saved email</b>
              <PropertySelect
                value={values.templateId}
                options={templateOptions}
                onChange={onTemplate}
                placeholder="Choose…"
              />
            </span>
          </div>
        </div>
      </Field>
    );
  } else if (source === "html") {
    email = (
      <Field label="The email" action={change}>
        {values.body.trim() ? (
          <div className="abp-mail">
            <EmailThumb html={values.body} onOpen={() => setPreviewing(true)} />
            <div className="abp-mail__row">
              <span className="abp-mail__ic">
                <CodeBracketIcon aria-hidden="true" />
              </span>
              <span className="abp-mail__meta">
                <b>Pasted HTML</b>
                <i>{kb(values.body)} · sent as written</i>
              </span>
            </div>
            <div className="abp-mail__acts">
              <button
                type="button"
                className="abp-btn"
                onClick={() => setPasting(true)}
              >
                Replace
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="abp-drop"
            onClick={() => setPasting(true)}
          >
            <CodeBracketIcon aria-hidden="true" />
            <b>Paste the email&apos;s HTML</b>
            <i>From Mailchimp, Figma, or any builder. 600px wide works best.</i>
          </button>
        )}
      </Field>
    );
  } else {
    // Written in the editor: the editor saves it as a template on this step.
    email = (
      <Field label="The email" action={change}>
        {values.templateId ? (
          <div className="abp-mail">
            <div className="abp-mail__row">
              <span className="abp-mail__ic">
                <PencilSquareIcon aria-hidden="true" />
              </span>
              <span className="abp-mail__meta">
                <b>{values.templateName || "Written in the editor"}</b>
                <i>Saved as you go</i>
              </span>
            </div>
            <div className="abp-mail__acts">
              <button
                type="button"
                className="abp-btn"
                disabled={opening}
                onClick={onOpenBuilder}
              >
                <PencilSquareIcon aria-hidden="true" className="h-3.5 w-3.5" />
                {opening ? "Opening…" : "Edit the email"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="abp-drop"
            disabled={opening}
            onClick={onOpenBuilder}
          >
            <PencilSquareIcon aria-hidden="true" />
            <b>{opening ? "Opening the editor…" : "Write the email"}</b>
            <i>Opens the editor. It saves as you go.</i>
          </button>
        )}
      </Field>
    );
  }

  return (
    <>
      <TextField
        label="Subject line"
        value={values.subject}
        onChange={(subject) => onChange({ subject })}
        placeholder="Welcome to Acme"
      />
      <TextField
        label="Preview text"
        optional
        value={values.previewText}
        onChange={(previewText) => onChange({ previewText })}
        placeholder="The grey line after the subject"
      />
      {email}
      {noVerifiedSender && !sendersLoading ? (
        <Field label="Send as">
          <p className="abp-note abp-note--warn">
            <InformationCircleIcon aria-hidden="true" />
            Verify a sending domain in Settings, then choose the address here.
            Until then it sends from the platform address.
          </p>
        </Field>
      ) : (
        <PickField
          label="Send as"
          value={values.sender}
          options={senderOptions}
          onChange={onSender}
          placeholder={
            sendersLoading ? "Loading senders…" : "Organization default"
          }
        />
      )}

      <PasteHtmlDialog
        open={pasting}
        initial={values.body}
        onClose={() => setPasting(false)}
        onSave={(html) => {
          // The runtime sends a template over the body, so pasted HTML
          // replaces any template the step had.
          onChange({
            emailSource: "html",
            body: html,
            templateId: "",
            templateName: "",
          });
          setPasting(false);
        }}
      />
      <PasteHtmlDialog.Preview
        open={previewing}
        html={values.body}
        onClose={() => setPreviewing(false)}
      />
    </>
  );
}
