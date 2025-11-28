import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "default" ? "dark" : "default");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      title={theme === "default" ? "Switch to Blue Style" : "Switch to Shopee Style"}
    >
      <Palette className="h-5 w-5" />
      <span className="sr-only">
        {theme === "default" ? "Switch to Blue Style" : "Switch to Shopee Style"}
      </span>
    </Button>
  );
}
