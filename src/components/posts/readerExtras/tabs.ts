import type { ReaderExtrasContext } from "./context";

/* 탭 — 라벨 버튼 헤더를 만들어 끼우고 active 패널만 보여준다. */
export function renderTabs({ el }: ReaderExtrasContext) {
  // ── Tabs ── 헤더(라벨 버튼)를 만들어 끼우고, active 패널만 표시 + 클릭 전환
  el.querySelectorAll<HTMLElement>("[data-tabs]").forEach((tabs) => {
    if (tabs.dataset.tabsRendered) return;
    const panels = Array.from(tabs.children).filter((c) => c.hasAttribute("data-tab-panel")) as HTMLElement[];
    if (!panels.length) return;
    tabs.dataset.tabsRendered = "1";
    const active = Math.min(Math.max(0, Number(tabs.getAttribute("data-active") || 0)), panels.length - 1);
    const header = document.createElement("div");
    header.className = "tabs-header";
    panels.forEach((panel, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tabs-tab" + (i === active ? " tabs-tab-active" : "");
      const icon = panel.getAttribute("data-tab-icon") || "";
      if (icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "tabs-tab-icon";
        if (icon.startsWith("img:")) {
          const img = document.createElement("img");
          img.src = icon.slice(4);
          img.alt = "";
          iconSpan.appendChild(img);
        } else if (!icon.startsWith("icon:")) {
          iconSpan.textContent = icon; // 이모지
        }
        if (iconSpan.childNodes.length || iconSpan.textContent) btn.appendChild(iconSpan);
      }
      const labelSpan = document.createElement("span");
      labelSpan.textContent = panel.getAttribute("data-label") || `Tab ${i + 1}`;
      btn.appendChild(labelSpan);
      btn.addEventListener("click", () => {
        header.querySelectorAll(".tabs-tab").forEach((b, j) => b.classList.toggle("tabs-tab-active", j === i));
        panels.forEach((p, j) => { p.style.display = j === i ? "" : "none"; });
      });
      header.appendChild(btn);
      panel.style.display = i === active ? "" : "none";
    });
    tabs.insertBefore(header, tabs.firstChild);
  });
}
