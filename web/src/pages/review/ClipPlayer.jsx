import { useRef, useState } from 'react';

// Shows the detection's clip (or still frame) with the AI's box. Box is in fractions of the frame.
export default function ClipPlayer({ detection, speciesName }) {
  const video = useRef(null);
  const [ratio, setRatio] = useState(16 / 9);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [slow, setSlow] = useState(false);
  const hasVideo = Boolean(detection.clipUrl);
  const { box } = detection;

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };
  const toggleSpeed = () => {
    const next = !slow;
    setSlow(next);
    if (video.current) video.current.playbackRate = next ? 0.5 : 1;
  };

  return (
    <div className="clip-player">
      <div className="clip-player__frame" style={{ aspectRatio: ratio }}>
        {hasVideo ? (
          <video
            ref={video}
            src={detection.clipUrl}
            muted
            playsInline
            onLoadedMetadata={(e) => {
              setRatio(e.target.videoWidth / e.target.videoHeight || 16 / 9);
              setDuration(e.target.duration);
            }}
            onTimeUpdate={(e) => setTime(e.target.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : detection.frameUrl ? (
          <img
            src={detection.frameUrl}
            alt={`ONC camera frame with a possible ${speciesName.toLowerCase()}`}
            onLoad={(e) => setRatio(e.target.naturalWidth / e.target.naturalHeight)}
          />
        ) : (
          <div className="clip-player__placeholder" role="img" aria-label="Placeholder frame; ONC footage will appear here">
            <span className="mono">Sample frame · ONC footage goes here</span>
          </div>
        )}
        {box && (
          <div
            className="detection-box"
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
          >
            <span className="detection-box__label mono">AI detection</span>
          </div>
        )}
      </div>

      <div className="clip-player__controls">
        <button type="button" onClick={toggle} disabled={!hasVideo} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          type="range"
          min="0"
          max={duration || 15}
          step="0.1"
          value={time}
          disabled={!hasVideo}
          aria-label="Scrub through clip"
          onChange={(e) => {
            if (video.current) video.current.currentTime = Number(e.target.value);
          }}
        />
        <span className="mono clip-player__time">
          {time.toFixed(1)}s / {(duration || 15).toFixed(0)}s
        </span>
        <button type="button" onClick={toggleSpeed} disabled={!hasVideo} aria-pressed={slow}>
          0.5×
        </button>
      </div>
      {!hasVideo && <p className="hint">Still frame for now. Playback turns on once ONC clips are added.</p>}
    </div>
  );
}
