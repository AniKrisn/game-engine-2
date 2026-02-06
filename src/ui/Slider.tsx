import { useTheme } from "./theme";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
}

export function Slider({ value, min, max, step = 0.01, onChange, label }: SliderProps) {
  const { theme } = useTheme();
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ position: "relative", width: "100%", height: 20, display: "flex", alignItems: "center" }}>
      {/* Background track (gray) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 3,
          background: theme.muted,
          borderRadius: 14,
          pointerEvents: "none",
        }}
      />
      {/* Filled track (blue) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: `${percentage}%`,
          height: 3,
          background: theme.selected,
          borderRadius: 14,
          pointerEvents: "none",
        }}
      />
      {/* Hidden native input for accessibility */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "grab",
          margin: 0,
        }}
      />
      {/* Custom thumb */}
      <div
        style={{
          position: "absolute",
          left: `calc(${percentage}% - 9px)`,
          width: 18,
          height: 18,
          background: theme.panel,
          borderRadius: 999,
          boxShadow: `inset 0px 0px 0px 2px ${theme.text1}`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default Slider;
