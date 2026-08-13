import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import usePolling, { updateIfChanged } from '../../hooks/usePolling';
import StatusBadge from '../../components/StatusBadge';
import SearchBar from '../../components/SearchBar';
import FilterDropdown from '../../components/FilterDropdown';
import Modal from '../../components/Modal';
import LotImageViewer from '../../components/LotImageViewer';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import toast from 'react-hot-toast';

export default function ClientBurialLots() {
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reserving, setReserving] = useState(false);
  const [viewingLot, setViewingLot] = useState(null);

  useEffect(() => {
    api.get('/burial-lots/list.php')
      .then(res => { setLots(res.data.data || []); setFiltered(res.data.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  usePolling(() => {
    api.get('/burial-lots/list.php')
      .then(res => updateIfChanged(setLots, res.data.data || []))
      .catch(() => {});
  });

  useEffect(() => {
    let result = lots;
    if (search) result = result.filter(l => l.lot_number.toLowerCase().includes(search.toLowerCase()) || l.section.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) result = result.filter(l => l.status === statusFilter);
    setFiltered(result);
  }, [search, statusFilter, lots]);

  const handleReservation = async () => {
    if (!selectedLot) return;
    setReserving(true);
    try {
      await api.post('/reservations/create.php', { burial_lot_id: selectedLot.id, slot_number: selectedSlot });
      toast.success('Reservation request submitted!');
      setSelectedLot(null);
      setSelectedSlot(null);
      const res = await api.get('/burial-lots/list.php');
      setLots(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reservation failed');
    } finally { setReserving(false); }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Burial Lots</h1>
        <p className="text-gray-500 mt-1">Browse and reserve available burial lots.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1"><SearchBar onSearch={setSearch} placeholder="Search by lot number or section..." /></div>
        <FilterDropdown label="All Statuses" value={statusFilter} onChange={setStatusFilter} options={[
          { value: 'available', label: 'Available' },
          { value: 'reserved', label: 'Reserved' },
          { value: 'occupied', label: 'Occupied' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
        {filtered.map(lot => (
          <div key={lot.id} className="bg-white rounded-2xl p-6 border border-gray-100 card-hover group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Lot {lot.lot_number}</h3>
                <p className="text-sm text-gray-500">Section {lot.section} · Block {lot.block}</p>
              </div>
              <StatusBadge status={lot.status} />
            </div>
            {lot.description && <p className="text-sm text-gray-500 mb-4 leading-relaxed">{lot.description}</p>}
            <div className="space-y-2">
              {lot.latitude && lot.longitude && (
                <button onClick={() => navigate('/client/map', { state: { focusLotId: lot.id } })} className="w-full bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition border border-gray-200 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Inspect on Map
                </button>
              )}
              {lot.image && (
                <button onClick={() => setViewingLot(lot)} className="w-full bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition border border-gray-200 flex items-center justify-center gap-2">
                  {lot.image_type === '360' ? '🌐 View 360°' : '📷 View Photo'}
                </button>
              )}
              {lot.status === 'available' && (
                <button onClick={() => setSelectedLot(lot)} className="btn-primary w-full text-sm py-2.5">
                  Request Reservation
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="text-center py-16"><p className="text-gray-400">No burial lots found.</p></div>}

      {selectedLot && (
        <Modal title="Confirm Reservation" onClose={() => setSelectedLot(null)}>
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Lot Number</span><span className="font-medium">{selectedLot.lot_number}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Section</span><span className="font-medium">{selectedLot.section}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Block</span><span className="font-medium">{selectedLot.block}</span></div>
          </div>
          <p className="text-sm text-gray-600 mb-5">Are you sure you want to request a reservation for this burial lot?</p>
          <div className="flex gap-3">
            <button onClick={() => setSelectedLot(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleReservation} disabled={reserving} className="btn-primary flex-1">
              {reserving ? 'Submitting...' : 'Confirm'}
            </button>
          </div>
        </Modal>
      )}

      {viewingLot && <LotImageViewer lot={viewingLot} onClose={() => setViewingLot(null)} />}
    </div>
  );
}
