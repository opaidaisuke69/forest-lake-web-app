import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';
import usePolling, { updateIfChanged } from '../../hooks/usePolling';
import CemeteryMap from '../../components/CemeteryMap';
import MapSearch from '../../components/MapSearch';
import Modal from '../../components/Modal';
import { MapSkeleton } from '../../components/LoadingSkeleton';
import toast from 'react-hot-toast';

export default function ClientMap() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmLot, setConfirmLot] = useState(null);
  const [confirmSlot, setConfirmSlot] = useState(null);
  const [reserving, setReserving] = useState(false);
  const [focusCoords, setFocusCoords] = useState(null);
  const location = useLocation();
  const focusLotId = location.state?.focusLotId || null;

  const fetchLots = () => {
    api.get('/burial-lots/list.php')
      .then(res => setLots(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLots(); }, []);
  usePolling(() => {
    api.get('/burial-lots/list.php')
      .then(res => updateIfChanged(setLots, res.data.data || []))
      .catch(() => {});
  });

  const handleReserve = (lot, slotNumber) => {
    setConfirmLot(lot);
    setConfirmSlot(slotNumber);
  };

  const confirmReservation = async () => {
    if (!confirmLot) return;
    setReserving(true);
    try {
      await api.post('/reservations/create.php', { burial_lot_id: confirmLot.id, slot_number: confirmSlot });
      toast.success('Reservation submitted! Waiting for admin approval.');
      setConfirmLot(null);
      setConfirmSlot(null);
      fetchLots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reservation failed');
    } finally { setReserving(false); }
  };

  if (loading) return <MapSkeleton />;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cemetery Map</h1>
        <p className="text-gray-500 mt-1">View Geo-Tagged burial lot locations. Click a lot to view details or reserve.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <span className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full text-sm">
          <span className="w-3 h-3 bg-available rounded-full shadow-sm shadow-available/50"></span> Available
        </span>
        <span className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full text-sm">
          <span className="w-3 h-3 bg-reserved rounded-full shadow-sm shadow-reserved/50"></span> Reserved
        </span>
        <span className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full text-sm">
          <span className="w-3 h-3 bg-occupied rounded-full shadow-sm shadow-occupied/50"></span> Occupied
        </span>
      </div>

      {/* Search */}
      <div className="mb-6">
        <MapSearch onSelectLot={setFocusCoords} />
      </div>

      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <CemeteryMap lots={lots} height="500px" onReserve={handleReserve} focusLotId={focusLotId} focusCoords={focusCoords} />
      </div>

      {/* Reservation Confirmation Modal */}
      {confirmLot && (
        <Modal title="Confirm Reservation" onClose={() => { setConfirmLot(null); setConfirmSlot(null); }}>
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Lot Number</span><span className="font-medium text-gray-900">{confirmLot.lot_number}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Section</span><span className="font-medium text-gray-900">{confirmLot.section}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Block</span><span className="font-medium text-gray-900">{confirmLot.block}</span></div>
            {confirmSlot && <div className="flex justify-between text-sm"><span className="text-gray-500">Slot</span><span className="font-medium text-blue-600">#{confirmSlot}</span></div>}
            {confirmLot.square_meter && <div className="flex justify-between text-sm"><span className="text-gray-500">Area</span><span className="font-medium text-gray-900">{confirmLot.square_meter} m²</span></div>}
          </div>
          <p className="text-sm text-gray-600 mb-5">Are you sure you want to reserve Slot #{confirmSlot} of this lot? Your request will be sent to the admin for approval.</p>
          <div className="flex gap-3">
            <button onClick={() => { setConfirmLot(null); setConfirmSlot(null); }} className="btn-secondary flex-1">Cancel</button>
            <button onClick={confirmReservation} disabled={reserving} className="btn-primary flex-1">
              {reserving ? 'Submitting...' : 'Confirm Reservation'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
