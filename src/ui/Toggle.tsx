import { useTheme } from "./theme";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  const { theme } = useTheme();

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        color: theme.text3,
        fontSize: 12,
      }}
    >
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          border: "none",
          padding: 2,
          cursor: "pointer",
          background: checked ? theme.selected : theme.muted,
          transition: "background 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: checked ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: theme.panel,
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            transition: "transform 0.15s",
          }}
        />
      </button>
    </label>
  );
}

export default Toggle;
