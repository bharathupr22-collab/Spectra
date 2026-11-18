"""Labelled evaluation harness for the lip-sync detector.

WHY THIS EXISTS
---------------
The previous evaluation set in this project was circular: it took a list of
hand-written "true offsets", then labelled each one by applying the same 45 ms
threshold rule the test then re-checked. It always scored 100% and measured
nothing.

This harness does the opposite. It BUILDS clips whose true offset is known
because the offset is what the generator injected into the media:

  * A speech-like amplitude envelope is synthesised at a fixed seed.
  * The audio track is that waveform; the video track flashes a mouth-like
    region whose brightness follows the SAME envelope, delayed or advanced by
    exactly `true_offset_ms`.
  * The detector is given only the resulting media file and must recover the
    injected offset.

Because the ground truth is the generator's injection parameter, the error we
report is a real measurement error, and clips where the two streams are the
same envelope shifted by a known amount are exactly the case the estimator
claims to solve. What this does NOT prove is accuracy on natural talking-head
footage (see the caveat in lipsync_detector.py); it proves the estimator
recovers the offset it is given and that the 45 ms verdict rule is applied
correctly.

Run:  python -m app.services.lipsync_eval
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import numpy as np

from app.services.lipsync import SYNC_THRESHOLD_MS, classify_offset
from app.services.lipsync_detector import (
    ENVELOPE_RATE_HZ,
    LipSyncMeasurementError,
    measure_offset_from_media,
)

EVAL_DIR = Path(__file__).resolve().parents[2] / "tests" / "test_data"
EVAL_JSON = EVAL_DIR / "lipsync_eval_set.json"


@dataclass
class EvalClip:
    clip_id: str
    true_offset_ms: float
    category: str
    seed: int
    duration_s: float = 3.0


def _speech_envelope(seed: int, n: int, rate: float = ENVELOPE_RATE_HZ) -> np.ndarray:
    """Synthesise a speech-like amplitude envelope (syllabic bursts).

    Sum of a few modulated bursts with randomised onsets, which has the
    ~2-8 Hz structure real speech produces.
    """
    rng = np.random.default_rng(seed)
    t = np.arange(n) / rate
    env = np.zeros(n)
    n_bursts = rng.integers(14, 22)
    for _ in range(n_bursts):
        start = rng.uniform(0, t[-1])
        width = rng.uniform(0.04, 0.11)
        amp = rng.uniform(0.4, 1.0)
        env += amp * np.exp(-0.5 * ((t - start) / width) ** 2)
    env += 0.05 * rng.standard_normal(n)
    env = np.clip(env, 0, None)
    return env / (env.max() or 1.0)


def build_clip(
    out_path: Path,
    true_offset_ms: float,
    seed: int,
    duration_s: float = 3.0,
    fps: int = 25,
) -> None:
    """Write an MP4 whose video lags the audio by exactly true_offset_ms.

    Positive offset  -> audio leads the video.
    Negative offset  -> audio lags the video.
    """
    from app.services.lipsync_detector import _ffmpeg_exe

    rate = ENVELOPE_RATE_HZ
    n = int(duration_s * rate)
    env = _speech_envelope(seed, n)

    # --- audio -------------------------------------------------------------
    audio_sr = 16000
    audio_n = int(duration_s * audio_sr)
    idx = np.linspace(0, n - 1, audio_n)
    audio_env = np.interp(idx, np.arange(n), env)
    t = np.arange(audio_n) / audio_sr
    carrier = np.sin(2 * np.pi * 180 * t) + 0.5 * np.sin(2 * np.pi * 360 * t)
    audio = (0.5 * audio_env * carrier).astype(np.float32)

    # --- video -------------------------------------------------------------
    # The mouth region brightness follows the SAME envelope, shifted by the
    # offset. Shift of +k envelope samples == audio leads by k/rate seconds.
    shift = int(round(true_offset_ms / 1000.0 * rate))
    video_env = np.zeros_like(env)
    if shift >= 0:
        # video content = env delayed by `shift` samples
        video_env[shift:] = env[: n - shift] if shift else env
    else:
        video_env[: n + shift] = env[-shift:]

    width, height = 160, 120
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    tmp_video = out_path.with_suffix(".tmp_video.mp4")
    vw = cv2.VideoWriter(str(tmp_video), fourcc, fps, (width, height))
    if not vw.isOpened():
        raise RuntimeError("OpenCV could not open a VideoWriter for evaluation clips.")

    n_frames = int(duration_s * fps)
    try:
        for f in range(n_frames):
            frame = np.full((height, width, 3), 40, dtype=np.uint8)
            # Head outline
            cv2.ellipse(frame, (80, 60), (45, 55), 0, 0, 360, (120, 110, 100), -1)
            # Eyes (static)
            cv2.circle(frame, (65, 45), 5, (240, 240, 240), -1)
            cv2.circle(frame, (95, 45), 5, (240, 240, 240), -1)
            # Mouth: height driven by the shifted envelope in the ROI
            ti = min(n - 1, int(f / fps * rate))
            openness = float(video_env[ti])
            mh = max(2, int(2 + openness * 16))
            cv2.ellipse(frame, (80, 88), (20, mh), 0, 0, 360, (30, 30, 30), -1)
            vw.write(frame)
    finally:
        vw.release()

    # --- mux ---------------------------------------------------------------
    ff = _ffmpeg_exe()
    pcm = (audio * 32767).astype(np.int16).tobytes()
    tmp_audio = out_path.with_suffix(".tmp_audio.wav")
    import wave

    with wave.open(str(tmp_audio), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(audio_sr)
        wf.writeframes(pcm)

    proc = subprocess.run(
        [
            ff, "-y", "-v", "error",
            "-i", str(tmp_video), "-i", str(tmp_audio),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-shortest",
            str(out_path),
        ],
        capture_output=True,
    )
    tmp_video.unlink(missing_ok=True)
    tmp_audio.unlink(missing_ok=True)
    if proc.returncode != 0:
        raise RuntimeError(
            "ffmpeg mux failed: " + (proc.stderr or b"").decode("utf-8", "ignore")[:300]
        )


def build_eval_set(n_clips: int = 120, seed: int = 20261118) -> list[EvalClip]:
    """Deterministic list of clips spanning the 45 ms decision boundary."""
    rng = np.random.default_rng(seed)
    clips: list[EvalClip] = []
    # Deliberately dense near +/-45 ms, where a detector earns or loses its
    # classification accuracy.
    for i in range(n_clips):
        bucket = i % 4
        if bucket == 0:
            off = float(rng.uniform(-25, 25))        # clearly in sync
        elif bucket == 1:
            off = float(rng.uniform(-60, -46))       # clearly out, lagging
        elif bucket == 2:
            off = float(rng.uniform(46, 60))         # clearly out, leading
        else:
            off = float(rng.uniform(25, 45)) * rng.choice([-1, 1])  # borderline
        off = round(off, 1)
        clips.append(
            EvalClip(
                clip_id=f"clip_{i + 1:03d}",
                true_offset_ms=off,
                category=classify_offset(abs(off)),
                seed=int(rng.integers(0, 2**31 - 1)),
            )
        )
    return clips


def evaluate(save_json: bool = True, verbose: bool = True) -> dict:
    clips = build_eval_set()
    errors: list[float] = []
    abs_errors: list[float] = []
    correct = 0
    measured = 0
    failures: list[dict] = []
    rows: list[dict] = []

    with tempfile.TemporaryDirectory() as td:
        tdp = Path(td)
        for clip in clips:
            path = tdp / f"{clip.clip_id}.mp4"
            build_clip(path, clip.true_offset_ms, clip.seed, clip.duration_s)
            try:
                m = measure_offset_from_media(path)
            except LipSyncMeasurementError as e:
                failures.append({"clip_id": clip.clip_id, "reason": e.reason, "detail": str(e)})
                rows.append({**asdict(clip), "measured_offset_ms": None,
                             "confidence": None, "predicted_category": "not_measured"})
                continue
            measured += 1
            err = m.offset_ms - clip.true_offset_ms
            errors.append(err)
            abs_errors.append(abs(err))
            pred = classify_offset(abs(m.offset_ms))
            ok = pred == clip.category
            correct += ok
            rows.append({
                **asdict(clip),
                "measured_offset_ms": m.offset_ms,
                "confidence": m.confidence,
                "predicted_category": pred,
                "correct": bool(ok),
            })
            if verbose and not ok:
                print(
                    f"  misclassified {clip.clip_id}: true={clip.true_offset_ms:+.1f} "
                    f"measured={m.offset_ms:+.1f} conf={m.confidence:.2f}"
                )

    n = len(clips)
    ae = np.array(abs_errors) if abs_errors else np.array([float("nan")])
    report = {
        "clips": n,
        "measured": measured,
        "unmeasurable": n - measured,
        "classification_accuracy": round(correct / n, 4),
        "mean_abs_error_ms": round(float(np.mean(ae)), 2),
        "median_abs_error_ms": round(float(np.median(ae)), 2),
        "p90_abs_error_ms": round(float(np.percentile(ae, 90)), 2),
        "max_abs_error_ms": round(float(np.max(ae)), 2),
        "within_10ms_pct": round(float(np.mean(ae <= 10.0)) * 100, 1),
        "within_20ms_pct": round(float(np.mean(ae <= 20.0)) * 100, 1),
        "threshold_ms": SYNC_THRESHOLD_MS,
        "failures": failures[:10],
        "notes": (
            "Synthetic clips with offsets injected by the generator (the ground "
            "truth is the injection parameter). Natural talking-head footage is "
            "out of scope for these numbers."
        ),
    }

    if verbose:
        print(json.dumps({k: v for k, v in report.items() if k != "failures"}, indent=2))

    if save_json:
        EVAL_DIR.mkdir(parents=True, exist_ok=True)
        EVAL_JSON.write_text(json.dumps(rows, indent=2), encoding="utf-8")
        if verbose:
            print(f"\nPer-clip results written to {EVAL_JSON}")

    return report


if __name__ == "__main__":
    evaluate()
    sys.exit(0)
