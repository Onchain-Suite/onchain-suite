import type { Metadata } from "next";

import {
  backendBaseUrl,
  publicBackendHeaders,
  unwrap,
} from "@/lib/public-forms-backend";

import {
  HostedForm,
  type HostedFormConfig,
} from "@/features/forms/components/hosted-form";
import {
  type CaptureFieldSpec,
  readDisplaySettings,
} from "@/features/forms/forms.service";

export const dynamic = "force-dynamic";

interface RawPublicForm {
  name?: string;
  status?: string;
  fields?: CaptureFieldSpec[];
  settings?: Record<string, unknown>;
  zkEnabled?: boolean;
}

async function fetchPublicForm(token: string): Promise<RawPublicForm | null> {
  try {
    const res = await fetch(
      `${backendBaseUrl()}/public/forms/${encodeURIComponent(token)}`,
      { headers: publicBackendHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return unwrap<RawPublicForm>(json);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const form = await fetchPublicForm(token);
  const display = readDisplaySettings(form?.settings);
  const title = form?.name ? `${form.name} - ${display.headline}` : "Join";
  return { title, description: display.description };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08090b] px-4 py-12">
      {children}
    </main>
  );
}

export default async function HostedFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const form = await fetchPublicForm(token);

  if (!form) {
    return (
      <Shell>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0f12] p-8 text-center text-white">
          <h1 className="text-lg font-semibold">Form unavailable</h1>
          <p className="mt-2 text-sm text-white/60">
            This form doesn&apos;t exist or isn&apos;t accepting responses right
            now.
          </p>
        </div>
      </Shell>
    );
  }

  if (form.status && form.status !== "active") {
    return (
      <Shell>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0f12] p-8 text-center text-white">
          <h1 className="text-lg font-semibold">
            {form.name ?? "This form"} is paused
          </h1>
          <p className="mt-2 text-sm text-white/60">
            It isn&apos;t accepting new responses at the moment.
          </p>
        </div>
      </Shell>
    );
  }

  const config: HostedFormConfig = {
    token,
    name: form.name ?? "Untitled form",
    fields: form.fields ?? [],
    settings: form.settings ?? {},
    display: readDisplaySettings(form.settings),
    zkEnabled: Boolean(form.zkEnabled),
  };

  return (
    <Shell>
      <div className="w-full">
        <HostedForm config={config} />
        <p className="mt-4 text-center text-xs text-white/30">
          Powered by OnchainSuite
        </p>
      </div>
    </Shell>
  );
}
