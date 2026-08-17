"use client";

/**
 * 白噪音引擎：Web Audio API 实时合成（白噪声 buffer + 低通滤波近似粉红噪声），
 * 不引用任何外部音频文件或 CDN。必须由用户手势触发 start()（浏览器 autoplay 策略），
 * 退出时调用 close() 释放 AudioContext。
 */
export class PinkNoiseEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private volume = 0.35;

  private static resolveCtor(): typeof AudioContext | null {
    if (typeof window === "undefined") return null;
    if (typeof window.AudioContext !== "undefined") return window.AudioContext;
    const legacy = window as Window & { webkitAudioContext?: typeof AudioContext };
    return legacy.webkitAudioContext ?? null;
  }

  private ensureGraph(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctor = PinkNoiseEngine.resolveCtor();
    if (!Ctor) throw new Error("当前浏览器不支持 Web Audio API");

    const ctx = new Ctor();
    const seconds = 2;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.value = this.volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this.sourceNode = source;
    this.gainNode = gain;
    this.ctx = ctx;
    return ctx;
  }

  /** 由用户手势调用；ctx 已存在且 suspended 时恢复播放 */
  start(): void {
    const ctx = this.ensureGraph();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  get state(): AudioContextState | "closed" {
    return this.ctx?.state ?? "closed";
  }

  getVolume(): number {
    return this.volume;
  }

  /** 停止播放并释放 AudioContext（退出专注模式时调用） */
  close(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        /* 已停止 */
      }
    }
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close();
    }
    this.sourceNode = null;
    this.gainNode = null;
    this.ctx = null;
  }
}
