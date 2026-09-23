import { useEffect, useState } from 'react';
import api from '../../utils/api';
import usePolling, { updateIfChanged } from '../../hooks/usePolling';
import StatusBadge from '../../components/StatusBadge';
import FilterDropdown from '../../components/FilterDropdown';
import SearchBar from '../../components/SearchBar';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import { formatDate } from '../../utils/helpers';

export default function ClientHistory() {
  const [reservations, setReservations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deceased, setDeceased] = useState([]);

  const fetchData = () => {
    Promise.all([
      api.get('/reservations/list.php'),
      api.get('/deceased/mine.php').catch(() => ({ data: { data: [] } })),
    ])
      .then(([resRes, decRes]) => {
        const data = resRes.data.data || [];
        setReservations(data);
        setFiltered(data);
        setDeceased(decRes.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);
  usePolling(() => {
    api.get('/reservations/list.php')
      .then(res => updateIfChanged(setReservations, res.data.data || []))
      .catch(() => {});
    api.get('/deceased/mine.php')
      .then(res => updateIfChanged(setDeceased, res.data.data || []))
      .catch(() => {});
  });

  // Build a remarks string per reservation: admin remarks + any deceased
  // record feedback (especially rejection reasons) so history is never empty
  // when there is relevant information to show.
  const remarksFor = (r) => {
    const parts = [];
    if (r.admin_remarks) parts.push(r.admin_remarks);
    deceased
      .filter(d => String(d.reservation_id) === String(r.id) && d.admin_remarks)
      .forEach(d => {
        const label = d.status === 'rejected' ? 'Rejected' : 'Note';
        parts.push(`${label} (${d.name}): ${d.admin_remarks}`);
      });
    return parts.join(' • ');
  };

  useEffect(() => {
    let result = reservations;
    if (search) result = result.filter(r => `${r.lot_number || ''} ${r.serial_number || ''} ${r.section || ''}`.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) result = result.filter(r => r.status === statusFilter);
    setFiltered(result);
  }, [search, statusFilter, reservations]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reservation History</h1>
        <p className="text-gray-500 mt-1">Complete history of all your reservation activities.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1"><SearchBar onSearch={setSearch} placeholder="Search by lot, serial number..." /></div>
        <FilterDropdown label="All Statuses" value={statusFilter} onChange={setStatusFilter} options={[
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'occupied', label: 'Occupied' },
          { value: 'declined', label: 'Declined' },
          { value: 'cancelled', label: 'Cancelled' },
        ]} />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📜</span>
          </div>
          <p className="text-gray-500 font-medium">No history found</p>
          <p className="text-sm text-gray-400 mt-1">Your complete reservation history will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Serial #</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Lot</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Section</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono text-gray-700 text-xs">{r.serial_number || `#${r.id}`}</td>
                    <td className="px-5 py-4 font-medium text-gray-900">{r.lot_number}</td>
                    <td className="px-5 py-4 text-gray-600">{r.section} · {r.block}</td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(r.reservation_date || r.created_at)}</td>
                    <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-4 text-gray-500 text-xs max-w-[240px]" title={remarksFor(r)}>{remarksFor(r) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
