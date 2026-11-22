import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UnengagedSetting } from "./unengaged-setting";

const get = vi.fn();
const set = vi.fn();
vi.mock("@/features/automation/automation-sunset.service", () => ({
  automationSunsetService: {
    get: (...a: unknown[]) => get(...a),
    set: (...a: unknown[]) => set(...a),
  },
}));

const renderSetting = (automationId?: string, onSettingsChange = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UnengagedSetting
        automationId={automationId}
        settings={{ reentry: "once" }}
        onSettingsChange={onSettingsChange}
      />
    </QueryClientProvider>
  );
  return onSettingsChange;
};

describe("UnengagedSetting", () => {
  beforeEach(() => {
    get.mockReset();
    set.mockReset();
  });

  it("saves the switch and mirrors it into the graph settings", async () => {
    get.mockResolvedValue({ automationId: "a1", sunset: true, default: true });
    set.mockResolvedValue({ automationId: "a1", sunset: false, default: true });
    const onSettingsChange = renderSetting("a1");

    const sw = await screen.findByRole("switch", {
      name: "Include unengaged contacts",
    });
    await waitFor(() => expect(get).toHaveBeenCalledWith("a1"));
    fireEvent.click(sw);
    fireEvent.click(
      await screen.findByRole("button", { name: "Include them" })
    );

    await waitFor(() => expect(set).toHaveBeenCalledWith("a1", false));
    await waitFor(() =>
      expect(onSettingsChange).toHaveBeenCalledWith({
        reentry: "once",
        sunset: false,
      })
    );
  });

  it("writes only the graph for an automation that is not saved yet", async () => {
    const onSettingsChange = renderSetting(undefined);
    fireEvent.click(
      screen.getByRole("switch", { name: "Include unengaged contacts" })
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Include them" })
    );
    expect(set).not.toHaveBeenCalled();
    expect(onSettingsChange).toHaveBeenCalledWith({
      reentry: "once",
      sunset: false,
    });
  });
});
