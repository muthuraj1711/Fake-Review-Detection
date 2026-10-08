import { FileText, Image, Link as LinkIcon } from "lucide-react";

const modes = [
  {
    id: "text",
    label: "Review text",
    icon: FileText,
  },
  {
    id: "image",
    label: "Screenshot",
    icon: Image,
  },
  {
    id: "url",
    label: "Product / Review URL",
    icon: LinkIcon,
  },
];

export default function InputModeSelector({ mode, onChange }) {
  return (
    <div className="input-mode-selector">
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={mode === id ? "mode-btn active" : "mode-btn"}
          onClick={() => onChange(id)}
        >
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
