interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex cursor-help">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden w-48 -translate-x-1/2 rounded-lg bg-gray-900 px-2 py-1.5 text-xs text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}
