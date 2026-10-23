import { Kpi, Pill, PreviewFrame } from './Frame';

const depts = [
  { name: 'Operations', v: 42 },
  { name: 'Sales', v: 28 },
  { name: 'Finance', v: 14 },
  { name: 'Engineering', v: 35 },
];
const leave = [
  { who: 'Priya N.', type: 'Annual leave', days: '3 days', status: 'Pending' },
  { who: 'Daniel O.', type: 'Sick leave', days: '1 day', status: 'Approved' },
  { who: 'Mei L.', type: 'Annual leave', days: '5 days', status: 'Approved' },
];

export function HrmsPreview({ className, caption }: { className?: string; caption?: boolean }) {
  const max = Math.max(...depts.map((d) => d.v));
  return (
    <PreviewFrame title="HRMS · People overview" className={className} caption={caption}>
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_1.3fr]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <Kpi label="Employees" value="119" note="Sample data" />
          <Kpi label="On leave today" value="6" />
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-semibold">Headcount by department</p>
          <ul className="mt-3 space-y-2.5">
            {depts.map((d) => (
              <li key={d.name} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-[0.6875rem]">
                <span className="truncate text-text-secondary">{d.name}</span>
                <span className="h-2 rounded-full bg-highlight">
                  <span className="block h-2 rounded-full bg-primary" style={{ width: `${(d.v / max) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{d.v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border sm:col-span-2">
          <p className="border-b border-border px-3 py-2 text-xs font-semibold">Leave requests</p>
          <table className="w-full text-left text-[0.6875rem]">
            <tbody>
              {leave.map((l) => (
                <tr key={l.who} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{l.who}</td>
                  <td className="px-3 py-2 text-text-secondary">{l.type}</td>
                  <td className="hidden px-3 py-2 text-text-secondary sm:table-cell">{l.days}</td>
                  <td className="px-3 py-2 text-right"><Pill tone={l.status === 'Pending' ? 'amber' : 'green'}>{l.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PreviewFrame>
  );
}
