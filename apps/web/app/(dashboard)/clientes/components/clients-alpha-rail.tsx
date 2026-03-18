"use client";

interface ClientsAlphaRailProps {
  letters: string[];
  existingLetters: Set<string>;
  activeLetter: string | null;
  visible: boolean;
  onSelectLetterAction: (letter: string) => void;
}

export function ClientsAlphaRail({
  letters,
  existingLetters,
  activeLetter,
  visible,
  onSelectLetterAction,
}: ClientsAlphaRailProps) {
  return (
    <div
      className={`rounded-full border border-white/80 bg-white/90 px-1.5 py-2 shadow-[0_14px_38px_rgba(74,78,70,0.14)] backdrop-blur transition-all duration-200 ${
        visible ? "translate-x-0 scale-100 opacity-100" : "translate-x-4 scale-95 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="flex flex-col items-center gap-1">
        {letters.map((letter) => {
          const exists = existingLetters.has(letter);
          const isActive = activeLetter === letter;
          if (!exists) {
            return <span key={letter} className="h-1 w-1 rounded-full bg-studio-green/18" />;
          }

          return (
            <button
              key={letter}
              type="button"
              onClick={() => onSelectLetterAction(letter)}
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black transition ${
                isActive
                  ? "bg-studio-green text-white shadow-sm"
                  : "text-studio-green/85 hover:bg-studio-light active:scale-95"
              }`}
              aria-label={`Ir para a letra ${letter}`}
              title={`Ir para a letra ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
