interface ActionButtonProps {
  label: string;
  onClick: () => void;
  color: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

export function ActionButton({
  label,
  onClick,
  color,
  disabled = false,
  loading = false,
  loadingLabel = 'Loading…'
}: ActionButtonProps) {
  const colorClasses = {
  // make primary lighter by default (start button)
  primary: 'gradient-yellow-light hover:gradient-yellow-deep focus:ring-yellow-500',
  secondary: 'gradient-yellow-light hover:gradient-yellow-deep focus:ring-yellow-400',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:ring-red-500'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-2 px-4 ${colorClasses[color]} text-black font-semibold rounded-xl 
        focus:outline-none focus:ring-2 focus:ring-offset-1 
        btn-professional animate-slide-in
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        flex items-center justify-center space-x-2 text-shadow-sm
        border border-yellow-600/20 shadow-lg text-sm`}
      aria-busy={loading || undefined}
      aria-live="polite"
    >
      {loading && <span className="animate-pulse">⏳</span>}
      <span>{loading ? loadingLabel : label}</span>
    </button>
  );
}
