import { useEffect, useState } from 'react';
import api from '../../utils/api';
import usePolling, { updateIfChanged } from '../../hooks/usePolling';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import toast from 'react-hot-toast';

export default function ClientManageLots() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deceasedModal, setDeceasedModal] = useState(null);
  const [deceasedList, setDeceasedList] = useState([]);
  const [deceasedForm, setDeceasedForm] = useState({ name: '', gender: '', date_of_birth: '', date_of_death: '', burial_date: '' });
  const [savingDeceased, setSavingDeceased] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [birthCert, setBirthCert] = useState(null);
  const [deathCert, setDeathCert] = useState(null);

  useEffect(() => {
    api.get('/reservations/list.php')
      .then(res => {
        const data = res.data.data || [];
        setReservations(data.filter(r => r.status === 'approved' || r.status === 'occupied'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  usePolling(() => {
    api.get('/reservations/list.php')
      .then(res => {
        const data = res.data.data || [];
        updateIfChanged(setReservations, data.filter(r => r.status === 'approved' || r.status === 'occupied'));
      })
      .catch(() => {});
  });

  const openDeceasedModal = async (reservation) => {
    setDeceasedModal(reservation);
    setDeceasedForm({ name: '', gender: '', date_of_birth: '', date_of_death: '', burial_date: '' });
    setImageFile(null);
    try {
      const res = await api.get(`/deceased/list.php?reservation_id=${reservation.id}`);
      setDeceasedList(res.data.data || []);
    } catch {
      setDeceasedList([]);
    }
  };

  const handleSubmitDeceased = async (e) => {
    e.preventDefault();
    if (!deceasedForm.name.trim()) { toast.error('Name is required'); return; }
    if (!deceasedForm.gender) { toast.error('Gender is required'); return; }
    setSavingDeceased(true);
    try {
      const res = await api.post('/deceased/create.php', { burial_lot_id: deceasedModal.burial_lot_id, reservation_id: deceasedModal.id, ...deceasedForm });
      const newId = res.data.id;

      // Upload image if provided
      if (imageFile && newId) {
        const formData = new FormData();
        formData.append('deceased_id', newId);
        formData.append('image', imageFile);
        await api.post('/deceased/upload-image.php', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      // Upload required documents if provided
      const uploadDoc = async (file, docType) => {
        if (!file || !newId) return;
        const fd = new FormData();
        fd.append('deceased_id', newId);
        fd.append('doc_type', docType);
        fd.append('document', file);
        await api.post('/deceased/upload-document.php', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      };
      await uploadDoc(birthCert, 'birth_certificate');
      await uploadDoc(deathCert, 'death_certificate');

      toast.success('Deceased info submitted for admin review');
      setDeceasedForm({ name: '', gender: '', date_of_birth: '', date_of_death: '', burial_date: '' });
      setImageFile(null);
      setBirthCert(null);
      setDeathCert(null);
      // Refresh list
      const listRes = await api.get(`/deceased/list.php?reservation_id=${deceasedModal.id}`);
      setDeceasedList(listRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSavingDeceased(false); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) return <CardSkeleton count={4} />;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Lots</h1>
        <p className="text-gray-500 mt-1">Submit deceased information for your reserved lots. Admin will review and approve your submissions.</p>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-gray-500 font-medium">No active lots</p>
          <p className="text-sm text-gray-400 mt-1">Your approved reservations will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {reservations.map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-6 border border-gray-100 card-hover">
              <div className="flex items-center justify-between mb-3">
                <StatusBadge status={r.status} />
                <span className="text-xs font-mono text-gray-400">{r.serial_number || `#${r.id}`}</span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Lot {r.lot_number}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-4">
                <span>Section: <span className="text-gray-700 font-medium">{r.section}</span></span>
                <span>Block: <span className="text-gray-700 font-medium">{r.block}</span></span>
              </div>
              <button onClick={() => openDeceasedModal(r)} className="w-full text-sm bg-purple-50 text-purple-600 px-4 py-2.5 rounded-xl font-medium hover:bg-purple-100 border border-purple-100 transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Deceased Info
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Deceased Information Modal */}
      {deceasedModal && (
        <Modal title={`Deceased Info — Lot ${deceasedModal.lot_number}`} onClose={() => setDeceasedModal(null)}>
          <p className="text-xs text-gray-400 mb-4">Serial: {deceasedModal.serial_number || `#${deceasedModal.id}`}</p>

          {/* Existing submissions */}
          {deceasedList.length > 0 && (
            <div className="mb-6 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Submissions</p>
              {deceasedList.map(d => (
                <div key={d.id} className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-gray-900">{d.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(d.status || 'approved')}`}>
                      {(d.status || 'approved').toUpperCase()}
                    </span>
                  </div>
                  {d.date_of_birth && <p className="text-gray-500">Born: <span className="text-gray-700">{d.date_of_birth}</span></p>}
                  {d.date_of_death && <p className="text-gray-500">Died: <span className="text-gray-700">{d.date_of_death}</span></p>}
                  {d.burial_date && <p className="text-gray-500">Burial Date: <span className="text-gray-700">{d.burial_date}</span></p>}
                  {d.status === 'pending' && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Waiting for admin review
                    </p>
                  )}
                  {d.status === 'rejected' && (
                    <div className="mt-2">
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Rejected by admin
                      </p>
                      {d.admin_remarks && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-1">
                          <span className="font-semibold">Reason:</span> {d.admin_remarks}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit form - only when the slot is occupied and no approved/pending record exists */}
          {deceasedModal.status !== 'occupied' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              <p className="font-semibold mb-1">Deceased information not yet available</p>
              <p className="text-xs">You can submit deceased information once this slot has been marked as <span className="font-semibold">occupied</span> by the administrator.</p>
            </div>
          ) : deceasedList.filter(d => d.status === 'approved' || d.status === 'pending').length < 1 ? (
            <form onSubmit={handleSubmitDeceased} className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Submit Deceased Information</p>
              <p className="text-xs text-gray-400 mb-2">Your submission will be reviewed by the admin before being approved. Please ensure a valid <span className="font-medium">birth certificate</span> and <span className="font-medium">death certificate</span> are ready to upload.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={deceasedForm.name} onChange={e => setDeceasedForm({...deceasedForm, name: e.target.value})} required className="input-modern" placeholder="Full name of deceased" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select value={deceasedForm.gender} onChange={e => setDeceasedForm({...deceasedForm, gender: e.target.value})} required className="input-modern">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" value={deceasedForm.date_of_birth} onChange={e => setDeceasedForm({...deceasedForm, date_of_birth: e.target.value})} className="input-modern" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Death</label>
                  <input type="date" value={deceasedForm.date_of_death} onChange={e => setDeceasedForm({...deceasedForm, date_of_death: e.target.value})} className="input-modern" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Burial Date</label>
                <input type="date" value={deceasedForm.burial_date} onChange={e => setDeceasedForm({...deceasedForm, burial_date: e.target.value})} className="input-modern" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo of Deceased</label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImageFile(e.target.files[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-purple-50 file:text-purple-600 file:font-medium hover:file:bg-purple-100 file:transition-all cursor-pointer" />
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WEBP. Max 5MB.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required Documents</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth Certificate</label>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setBirthCert(e.target.files[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-purple-50 file:text-purple-600 file:font-medium hover:file:bg-purple-100 file:transition-all cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Death Certificate</label>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setDeathCert(e.target.files[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-purple-50 file:text-purple-600 file:font-medium hover:file:bg-purple-100 file:transition-all cursor-pointer" />
                </div>
                <p className="text-xs text-gray-400">JPG, PNG, WEBP, or PDF. Max 10MB each. The admin will verify these before accepting.</p>
              </div>
              <button type="submit" disabled={savingDeceased} className="w-full btn-primary mt-2">
                {savingDeceased ? 'Submitting...' : 'Submit for Review'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 bg-blue-50 rounded-xl border border-blue-100">
              <svg className="w-8 h-8 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm text-blue-700 font-medium">Deceased record submitted</p>
              <p className="text-xs text-blue-600 mt-1">The admin will review and approve your submission.</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
