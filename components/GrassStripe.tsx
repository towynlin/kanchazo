export default function GrassStripe({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`grass-stripe ${className}`} />;
}
