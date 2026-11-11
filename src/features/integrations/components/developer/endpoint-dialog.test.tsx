import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { developerService } from "../../developer.service";
import { EndpointDialog } from "./endpoint-dialog";

vi.mock("../../developer.service", () => ({
  developerService: { createWebhook: vi.fn(), updateWebhook: vi.fn() },
}));
vi.mock("../../hooks/use-webhooks", () => ({
  useWebhookTopics: () => ({
    data: ["contact.created", "message.delivered"],
    isPending: false,
  }),
}));
vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org_1" }),
}));

const create = vi.mocked(developerService.createWebhook);

function renderDialog(onClose = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EndpointDialog target="new" onClose={onClose} />
    </QueryClientProvider>
  );
  return { onClose };
}

const fillAndSubmit = () => {
  fireEvent.change(screen.getByLabelText("Endpoint URL"), {
    target: { value: "https://api.yourdapp.com/hooks" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /contact\.created/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add endpoint" }));
};

describe("EndpointDialog", () => {
  beforeEach(() => create.mockReset());

  it("needs an https address and at least one topic", () => {
    renderDialog();
    const add = screen.getByRole("button", { name: "Add endpoint" });
    expect(add).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "http://api.yourdapp.com/hooks" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /contact\.created/ }));
    expect(add).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "https://api.yourdapp.com/hooks" },
    });
    expect(add).toBeEnabled();
  });

  // The signing secret comes back exactly once, to this form. Closing while
  // the request was in flight unmounted it and threw the secret away.
  it("does not close while the endpoint is being created, then shows the secret", async () => {
    let finish: (v: unknown) => void = () => undefined;
    create.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }) as never
    );
    const { onClose } = renderDialog();
    fillAndSubmit();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled()
    );

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      finish({ id: "wh_new", secret: "whsec_shown_once" });
    });
    expect(await screen.findByText("whsec_shown_once")).toBeInTheDocument();

    // With the secret on screen, closing is theirs to do.
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape when nothing is being saved", () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
