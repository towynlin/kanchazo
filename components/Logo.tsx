interface Props {
  className?: string;
}

export default function Logo({ className = "" }: Props) {
  return (
    <span className={`font-display font-extrabold text-[22px] leading-none ${className}`}>
      Kanch<span className="text-mk-yellow">azo</span>
    </span>
  );
}
