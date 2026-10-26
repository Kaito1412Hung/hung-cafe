/**
 * Tiếng "ting" khi admin có đơn mới — tự tạo bằng Web Audio, không cần file âm thanh.
 * Trình duyệt chỉ cho phát tiếng sau khi người dùng đã bấm / gõ vào trang ít nhất 1 lần.
 */
const STORAGE_KEY = "hungcafe-sound";

export function isSoundOn() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Trình duyệt chặn lưu (chế độ riêng tư) → chỉ đổi trong lần mở này
  }
}

let ctx: AudioContext | null = null;

export function playTing() {
  if (!isSoundOn()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    // 2 nốt cao ngắn: "ting - ting"
    [0, 0.16].forEach((offset, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 1318.5 : 1760; // Mi6, La6
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.4);
    });
  } catch {
    // Trình duyệt không hỗ trợ / chưa cho phát tiếng → bỏ qua
  }
}
