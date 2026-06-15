export default function FloodMemory() {
  return (
    <div className="flex items-start gap-3 rounded-r-lg border-l-4 border-cs-navy bg-cs-navy-lt p-3">
      <span aria-hidden className="text-cs-navy">⚠</span>
      <p className="text-sm leading-relaxed text-cs-midnight">
        This ZIP code (77027) has had{' '}
        <span className="font-semibold">312 flood insurance claims</span> since 2015 —
        Harvey (2017), Imelda (2019), Beryl (2024).
      </p>
    </div>
  );
}
