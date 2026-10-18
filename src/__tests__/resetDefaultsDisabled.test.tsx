import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AiSummaryOptions from "@/components/admin/AiSummaryField/AiSummaryOptions";
import { SiteConfigProvider } from "@/providers/SiteConfigProvider";
import { siteConfig, type SiteConfigData } from "@/config/site.config";
import { computeDelta } from "@/lib/settingsDelta";
import { sanitizeSummaryOptions } from "@/lib/ai/summary";
import { saveSummaryOptions } from "@/components/admin/AiSummaryField/summaryOptionsStore";
import { AdminDict } from "./_adminDict";
import enAdmin from "@/locales/en.admin.json";
import koAdmin from "@/locales/ko.admin.json";

const resetLabel = new RegExp(`^(${enAdmin.admin.aiSummaryField.options.reset}|${koAdmin.admin.aiSummaryField.options.reset})$`);

beforeEach(() => {
  localStorage.clear();
});

/* 이미 기본값이면 기본값 단추를 끈다(#1506) */
describe("기본값 단추", () => {
  const renderOptions = () =>
    render(
      <SiteConfigProvider initialConfig={siteConfig as unknown as SiteConfigData}>
        <AdminDict>
          <AiSummaryOptions onSubmit={() => {}} submitLabel="Go" />
        </AdminDict>
      </SiteConfigProvider>,
    );

  it("AI 요약 옵션 — 사이트 기본값 그대로면 꺼져 있다", () => {
    renderOptions();
    expect(screen.getByRole("button", { name: resetLabel })).toHaveProperty("disabled", true);
  });

  it("AI 요약 옵션 — 지난번에 바꿔 둔 옵션이면 켜지고, 누르면 기본값으로 돌아가 꺼진다", () => {
    saveSummaryOptions({ ...sanitizeSummaryOptions(undefined), instruction: "더 짧게" });
    renderOptions();
    const reset = screen.getByRole("button", { name: resetLabel });
    expect(reset).toHaveProperty("disabled", false);
    fireEvent.click(reset);
    expect(screen.getByRole("button", { name: resetLabel })).toHaveProperty("disabled", true);
  });

  it("설정 위쪽 '기본값으로' — 기본값과 다른 부분(computeDelta)이 비면 기본값이다. 값이 빈 키가 더 있어도 같다", () => {
    expect(Object.keys(computeDelta(structuredClone(siteConfig), siteConfig))).toHaveLength(0);
    const withUndefined = { ...structuredClone(siteConfig), metadata: { ...siteConfig.metadata, extra: undefined } };
    expect(Object.keys(computeDelta(withUndefined, siteConfig))).toHaveLength(0);
    const changed = { ...structuredClone(siteConfig), metadata: { ...siteConfig.metadata, title: "다른 이름" } };
    expect(Object.keys(computeDelta(changed, siteConfig))).toEqual(["metadata"]);
  });
});
