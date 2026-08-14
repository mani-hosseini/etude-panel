export function DeckNavArrow({
  onClick,
  disabled,
  flip = false,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  flip?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-7 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/8 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-25"
    >
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        className={flip ? "" : "rotate-180"}
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M14.7 6.3a1 1 0 0 0-1.4 0l-6 6a1 1 0 0 0 0 1.4l6 6a1 1 0 1 0 1.4-1.4L9.42 13l5.28-5.3a1 1 0 0 0 0-1.4z"
        />
      </svg>
    </button>
  );
}
