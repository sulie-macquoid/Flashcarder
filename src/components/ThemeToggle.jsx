import { Moon, Sun } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export default function ThemeToggle() {
  const theme = useAppStore((state) => state.ui.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      {theme === "light" ? "Dark mode" : "Light mode"}
    </button>
  );
}
