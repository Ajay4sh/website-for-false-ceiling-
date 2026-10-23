import { Kpi, Pill, PreviewFrame } from './Frame';

const orders = [
  { id: 'SO-1042', customer: 'Northwind Supply', value: '12,480', status: 'Fulfilled', tone: 'green' as const },
  { id: 'SO-1043', customer: 'Bluefield Retail', value: '3,215', status: 'Picking', tone: 'blue' as const },
  { id: 'SO-1044', customer: 'Harbor & Co.', value: '8,960', status: 'Awaiting stock', tone: 'amber' as const },
  { id: 'SO-1045', customer: 'Kestrel Foods', value: '1,730', status: 'Invoiced', tone: 'slate' as const },
];
const stock = [
  { sku: 'Packaging film', pct: 78 },
  { sku: 'Steel brackets', pct: 22 },
  { sku: 'Labels (roll)', pct: 54 },
];

export function ErpPreview({ className, caption }: { className?: string; caption?: boolean }) {
  return (
    <PreviewFrame title="ERP · Orders and inventory" className={className} caption={caption}>
      <div className="grid gap-3 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Open orders" value="37" />
          <Kpi label="To invoice" value="9" />
          <Kpi label="Low stock" value="4" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
          <div className="rounded-lg border border-border">
            <p className="border-b border-border px-3 py-2 text-xs font-semibold">Sales orders</p>
            <table className="w-full text-left text-[0.6875rem]">
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-text-secondary">{o.id}</td>
                    <td className="px-3 py-2 font-medium leading-tight">{o.customer}</td>
                    <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{o.value}</td>
                    <td className="px-3 py-2 text-right"><Pill tone={o.tone}>{o.status}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold">Stock levels</p>
            <ul className="mt-3 space-y-3">
              {stock.map((s) => (
                <li key={s.sku} className="text-[0.6875rem]">
                  <div className="flex justify-between"><span className="text-text-secondary">{s.sku}</span><span className="tabular-nums">{s.pct}%</span></div>
                  <span className="mt-1 block h-1.5 rounded-full bg-background-light">
                    <span className={`block h-1.5 rounded-full ${s.pct < 30 ? 'bg-status-planned' : 'bg-secondary'}`} style={{ width: `${s.pct}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}
