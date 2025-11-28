import { useTheme } from "@/contexts/ThemeProvider";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: "default" as const,
      name: "Neon Carbon",
      description: "Dark gradient with neon blue",
      color: "#00bfff",
      gradient: "linear-gradient(135deg, #0f111a 0%, #1b1e2b 100%)",
    },
    {
      id: "dark" as const,
      name: "Dark Solid",
      description: "Pure dark professional",
      color: "#007aff",
      gradient: "#0b0c10",
    },
    {
      id: "light" as const,
      name: "Light Solid",
      description: "Clean bright workspace",
      color: "#2563eb",
      gradient: "#f4f4f9",
    },
    {
      id: "blue" as const,
      name: "Professional Blue",
      description: "Clean corporate aesthetic",
      color: "#4A90E2",
      gradient: "#E8F0F8",
    },
    {
      id: "calm" as const,
      name: "Calm Mode",
      description: "Serene blue with glass effects",
      color: "#0B5ED7",
      gradient: "#F6F9FC",
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;
    
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % themes.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + themes.length) % themes.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = themes.length - 1;
    }
    
    if (nextIndex !== currentIndex) {
      setTheme(themes[nextIndex].id);
      // Focus the next button
      const nextButton = document.querySelector(`[data-testid="theme-option-${themes[nextIndex].id}"]`) as HTMLButtonElement;
      nextButton?.focus();
    }
  };

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themes.map((t, index) => {
        const isSelected = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-testid={`theme-option-${t.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => setTheme(t.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg transition-all",
              "w-full"
            )}
          >
            <Card
              className={cn(
                "hover-elevate transition-all",
                isSelected && "ring-2 ring-primary"
              )}
            >
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {/* Visual color circle preview */}
                  <div 
                    className="w-10 h-10 rounded-full border-2 border-border transition-transform hover:scale-110 flex-shrink-0"
                    style={{ 
                      background: t.gradient,
                      boxShadow: isSelected ? `0 0 0 3px ${t.color}40` : 'none'
                    }}
                    aria-hidden="true"
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-semibold">{t.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                  
                  {isSelected && (
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                      aria-hidden="true"
                    >
                      ✓
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
