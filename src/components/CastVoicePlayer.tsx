"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CastVoicePlayerProps {
  src: string;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CastVoicePlayer({ src, className = "" }: CastVoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);

  const syncTime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(audio.currentTime);
    if (Number.isFinite(audio.duration)) setDuration(audio.duration);
  }, []);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setReady(false);
  }, [src]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    syncTime();
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className={`cast-voice ${className}`.trim()}>
      <div className="cast-voice__header">
        <span className="cast-voice__label">Voice</span>
        <span className="cast-voice__time" aria-hidden="true">
          {formatTime(current)}
          <span className="cast-voice__time-sep"> / </span>
          {formatTime(duration)}
        </span>
      </div>

      <div className="cast-voice__body">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={!ready}
          className="cast-voice__play"
          aria-label={playing ? "ボイスを一時停止" : "ボイスを再生"}
          aria-pressed={playing}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="2" y="1" width="3.5" height="12" rx="0.5" fill="currentColor" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="0.5" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 1.5v11l9-5.5-9-5.5z" fill="currentColor" />
            </svg>
          )}
        </button>

        <div
          className="cast-voice__track"
          role="slider"
          aria-label="再生位置"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={current}
          tabIndex={0}
          onClick={handleSeek}
          onKeyDown={(e) => {
            const audio = audioRef.current;
            if (!audio || !duration) return;
            const step = duration * 0.05;
            if (e.key === "ArrowRight") {
              audio.currentTime = Math.min(duration, audio.currentTime + step);
              syncTime();
            }
            if (e.key === "ArrowLeft") {
              audio.currentTime = Math.max(0, audio.currentTime - step);
              syncTime();
            }
          }}
        >
          <div className="cast-voice__track-bg" aria-hidden="true" />
          <div
            className="cast-voice__track-fill"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="sr-only"
        onLoadedMetadata={() => {
          setReady(true);
          syncTime();
        }}
        onTimeUpdate={syncTime}
        onEnded={() => {
          setPlaying(false);
          syncTime();
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
    </div>
  );
}
