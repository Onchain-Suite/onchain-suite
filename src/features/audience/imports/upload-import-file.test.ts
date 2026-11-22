import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildImportFormData, uploadImportFile } from "./upload-import-file";

const createImportJob = vi.fn();
vi.mock("../audience.service", () => ({
  audienceService: {
    createImportJob: (...a: unknown[]) => createImportJob(...a),
  },
}));

const consent = { source: "A signup form on our website" };

describe("uploadImportFile", () => {
  beforeEach(() => createImportJob.mockReset());

  it("sends the consent declaration inside options, through the proxy", async () => {
    createImportJob.mockResolvedValue({ jobId: "job_1" });
    const file = new File(["email\na@x.test"], "a.csv", { type: "text/csv" });
    const res = await uploadImportFile({
      file,
      format: "csv",
      query: { listId: "l1" },
      options: { consent },
    });
    expect(res).toEqual({ jobId: "job_1" });
    expect(createImportJob.mock.calls[0][0].options).toEqual({ consent });
  });

  it("accepts an id in place of jobId", async () => {
    createImportJob.mockResolvedValue({ id: "job_2" });
    const file = new File(["x"], "a.csv");
    await expect(
      uploadImportFile({ file, format: "csv", query: {}, options: { consent } })
    ).resolves.toEqual({ jobId: "job_2" });
  });

  it("builds a direct-upload body with options as its own JSON part", () => {
    const file = new File(["x"], "a.csv");
    const fd = buildImportFormData({
      file,
      format: "csv",
      mapping: { Email: "email" },
      query: {},
      options: { consent },
    });
    expect(JSON.parse(String(fd.get("options")))).toEqual({ consent });
    expect(fd.get("consent")).toBeNull();
    expect(JSON.parse(String(fd.get("mapping")))).toEqual({ Email: "email" });
  });
});
