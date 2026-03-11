export default function OccupancyBar ({ used, total }: { used: number; total: number }) {
  
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const color =
    pct >= 100 ? 'bg-destructive' :
    pct >= 75 ? 'bg-warning' :
    'bg-secondary';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Ocupação</span>
        <span className="font-semibold">
          {used}/{total} vagas ({pct}%)
          {pct >= 100 && <span className="ml-1 text-destructive font-bold">LOTADO</span>}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
};