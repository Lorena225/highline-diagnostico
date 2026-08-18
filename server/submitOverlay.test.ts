import { afterEach, describe, expect, it, vi } from "vitest";
import { SUBMIT_OVERLAY_DELAY_MS, scheduleSubmitOverlay } from "../client/src/lib/submitOverlay";

describe("submit overlay delay", () => {
  afterEach(() => vi.useRealTimers());

  it("aguarda antes de exibir o painel para tornar visível o estado do botão", () => {
    vi.useFakeTimers();
    const showOverlay = vi.fn();

    scheduleSubmitOverlay(showOverlay);
    vi.advanceTimersByTime(SUBMIT_OVERLAY_DELAY_MS - 1);
    expect(showOverlay).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(showOverlay).toHaveBeenCalledTimes(1);
  });

  it("cancela o painel se a submissão terminar antes do atraso", () => {
    vi.useFakeTimers();
    const showOverlay = vi.fn();

    const cancel = scheduleSubmitOverlay(showOverlay);
    cancel();
    vi.advanceTimersByTime(SUBMIT_OVERLAY_DELAY_MS);

    expect(showOverlay).not.toHaveBeenCalled();
  });
});
