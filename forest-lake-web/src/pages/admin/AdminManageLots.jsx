import { useEffect, useState } from 'react';
import api from '../../utils/api';
import usePolling, { updateIfChanged } from '../../hooks/usePolling';
import SearchBar from '../../components/SearchBar';
import FilterDropdown from '../../components/FilterDropdown';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminManageLots() {
  const [reservations, setReservations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRes, setSelectedRes] = useState(null);
  const [deceasedList, setDeceasedList] = useState([]);
  const [deceasedForm, setDeceasedForm] = useState({ name: '', gender: '', date_of_birth: '', date_of_death: '', relationship_to_client: '', burial_date: '' });
  const [editingDeceased, setEditingDeceased] = useState(null);
  const [savingDeceased, setSavingDeceased] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchData = () => {
    api.get('/reservations/list.php?role=admin')
      .then(res => {
        const data = (res.data.data || []).filter(r => r.status === 'approved' || r.status === 'occupied');
        setReservations(data);
        setFiltered(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);
  usePolling(() => {
    api.get('/reservations/list.php?role=admin')
      .then(res => {
        const data = (res.data.data || []).filter(r => r.status === 'approved' || r.status === 'occupied');
        updateIfChanged(setReservations, data);
      })
      .catch(() => {});
  });

  useEffect(() => {
    let result = reservations;
    if (search) result = result.filter(r => `${r.client_name || ''} ${r.lot_number || ''} ${r.serial_number || ''}`.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) result = result.filter(r => r.status === statusFilter);
    setFiltered(result);
  }, [search, statusFilter, reservations]);

  // Deceased management
  const openDeceasedModal = async (r) => {
    setSelectedRes(r);
    setEditingDeceased(null);
    setDeceasedForm({ name: '', gender: '', date_of_birth: '', date_of_death: '', relationship_to_client: '', burial_date: '' });
    setImageFile(null);
    try {
      const res = await api.get(`/deceased/list.php?reservation_id=${r.id}`);
      setDeceasedList(res.data.data || []);
    } catch { setDeceasedList([]); }
  };

  const handleSaveDeceased = async (e) => {
    e.preventDefault();
    if (!deceasedForm.name.trim()) { toast.error('Name is required'); return; }
    setSavingDeceased(true);
    try {
      let deceasedId;
      if (editingDeceased) {
        await api.put('/deceased/update.php', { id: editingDeceased.id, ...deceasedForm, status: 'approved' });
        deceasedId = editingDeceased.id;
        toast.success('Deceased info updated');
      } else {
        const res = await api.post('/deceased/create.php', { burial_lot_id: selectedRes.burial_lot_id, reservation_id: selectedRes.id, ...deceasedForm });
        deceasedId = res.data.id;
        toast.success('Deceased info added');
      }

      // Upload image if provided
      if (imageFile && deceasedId) {
        const formData = new FormData();
        formData.append('deceased_id', deceasedId);
        formData.append('image', imageFile);
        await api.post('/deceased/upload-image.php', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      // Refresh
      const res = await api.get(`/deceased/list.php?reservation_id=${selectedRes.id}`);
      setDeceasedList(res.data.data || []);
      setEditingDeceased(null);
      setDeceasedForm({ name: '', gender: '', date_of_birth: '', date_of_death: '', relationship_to_client: '', burial_date: '' });
      setImageFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSavingDeceased(false); }
  };

  const handleApproveDeceased = async (d) => {
    try {
      await api.put('/deceased/update.php', { id: d.id, name: d.name, date_of_birth: d.date_of_birth, date_of_death: d.date_of_death, relationship_to_client: d.relationship_to_client, burial_date: d.burial_date, status: 'approved' });
      toast.success('Deceased record approved');
      const res = await api.get(`/deceased/list.php?reservation_id=${selectedRes.id}`);
      setDeceasedList(res.data.data || []);
    } catch { toast.error('Failed to approve'); }
  };

  const handleRejectDeceased = async (d) => {
    try {
      await api.put('/deceased/update.php', { id: d.id, name: d.name, date_of_birth: d.date_of_birth, date_of_death: d.date_of_death, relationship_to_client: d.relationship_to_client, burial_date: d.burial_date, status: 'rejected' });
      toast.success('Deceased record rejected');
      const res = await api.get(`/deceased/list.php?reservation_id=${selectedRes.id}`);
      setDeceasedList(res.data.data || []);
    } catch { toast.error('Failed to reject'); }
  };

  const handleDeleteDeceased = async (id) => {
    if (!confirm('Delete this deceased record?')) return;
    try {
      await api.delete(`/deceased/delete.php?id=${id}`);
      toast.success('Record deleted');
      const res = await api.get(`/deceased/list.php?reservation_id=${selectedRes.id}`);
      setDeceasedList(res.data.data || []);
    } catch { toast.error('Delete failed'); }
  };

  const startEdit = (d) => {
    setEditingDeceased(d);
    setDeceasedForm({ name: d.name || '', gender: d.gender || '', date_of_birth: d.date_of_birth || '', date_of_death: d.date_of_death || '', relationship_to_client: d.relationship_to_client || '', burial_date: d.burial_date || '' });
    setImageFile(null);
  };

  // Mark as occupied
  const handleOccupy = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      await api.put('/reservations/occupy.php', { id: actionModal.id });
      toast.success('Marked as occupied');
      setActionModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setProcessing(false); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Client Lots</h1>
        <p className="text-gray-500 mt-1">Review client deceased submissions, manage records, and update statuses.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1"><SearchBar onSearch={setSearch} placeholder="Search by client, lot, serial..." /></div>
        <FilterDropdown label="All Statuses" value={statusFilter} onChange={setStatusFilter} options={[
          { value: 'approved', label: 'Approved' },
          { value: 'occupied', label: 'Occupied' },
        ]} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Serial #</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Lot</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-700">{r.serial_number || `#${r.id}`}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{r.client_name || 'N/A'}</td>
                  <td className="px-5 py-4 text-gray-600">{r.lot_number} <span className="text-gray-400">({r.section})</span></td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(r.created_at)}</td>
                  <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openDeceasedModal(r)} className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg font-medium hover:bg-purple-100 border border-purple-100 transition">
                        Deceased
                      </button>
                      {r.status === 'approved' && (
                        <button onClick={() => setActionModal(r)} className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 border border-amber-100 transition">
                          Occupy
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-16"><p className="text-gray-400 text-sm">No managed lots found.</p></div>}
      </div>

      {/* Deceased Modal */}
      {selectedRes && (
        <Modal title={`Deceased Info — ${selectedRes.lot_number} (${selectedRes.client_name})`} onClose={() => setSelectedRes(null)}>
          <p className="text-xs text-gray-400 mb-4">Serial: {selectedRes.serial_number || `#${selectedRes.id}`}</p>

          {deceasedList.length > 0 && (
            <div className="mb-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Records</p>
              {deceasedList.map(d => (
                <div key={d.id} className={`rounded-xl p-4 text-sm space-y-1.5 border ${d.status === 'pending' ? 'bg-amber-50 border-amber-200' : d.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {d.image ? (
                        <img src={`http://localhost/ForestLake/forest-lake-api${d.image}`} alt={d.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">{d.name?.[0]}</div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{d.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(d.status || 'approved')}`}>
                            {(d.status || 'approved').toUpperCase()}
                          </span>
                          {d.gender && <span className="text-[10px] text-gray-500 capitalize">{d.gender}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(d)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="Edit">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteDeceased(d.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition" title="Delete">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  {d.date_of_birth && <p className="text-gray-500">Born: <span className="text-gray-700">{d.date_of_birth}</span></p>}
                  {d.date_of_death && <p className="text-gray-500">Died: <span className="text-gray-700">{d.date_of_death}</span></p>}
                  {d.burial_date && <p className="text-gray-500">Burial Date: <span className="text-gray-700">{d.burial_date}</span></p>}

                  {/* Approve / Reject buttons for pending records */}
                  {d.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => handleApproveDeceased(d)} className="flex-1 text-xs bg-green-100 text-green-700 px-3 py-2 rounded-lg font-semibold hover:bg-green-200 border border-green-200 transition">
                        ✓ Approve
                      </button>
                      <button onClick={() => handleRejectDeceased(d)} className="flex-1 text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg font-semibold hover:bg-red-200 border border-red-200 transition">
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSaveDeceased} className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{editingDeceased ? 'Edit Record' : 'Add Deceased Info'}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={deceasedForm.name} onChange={e => setDeceasedForm({...deceasedForm, name: e.target.value})} required className="input-modern" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={deceasedForm.gender} onChange={e => setDeceasedForm({...deceasedForm, gender: e.target.value})} className="input-modern">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                <input type="text" value={deceasedForm.relationship_to_client} onChange={e => setDeceasedForm({...deceasedForm, relationship_to_client: e.target.value})} className="input-modern" placeholder="e.g. Father" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Burial Date</label>
                <input type="date" value={deceasedForm.burial_date} onChange={e => setDeceasedForm({...deceasedForm, burial_date: e.target.value})} className="input-modern" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImageFile(e.target.files[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-purple-50 file:text-purple-600 file:font-medium hover:file:bg-purple-100 file:transition-all cursor-pointer" />
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WEBP. Max 5MB.</p>
            </div>
            <div className="flex gap-2 pt-2">
              {editingDeceased && (
                <button type="button" onClick={() => { setEditingDeceased(null); setDeceasedForm({ name: '', gender: '', date_of_birth: '', date_of_death: '', relationship_to_client: '', burial_date: '' }); setImageFile(null); }} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold transition hover:bg-gray-200">
                  Clear
                </button>
              )}
              <button type="submit" disabled={savingDeceased} className="flex-1 btn-primary">
                {savingDeceased ? 'Saving...' : (editingDeceased ? 'Update' : 'Add')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Occupy Confirmation Modal */}
      {actionModal && (
        <Modal title={`Mark as Occupied — ${actionModal.lot_number}`} onClose={() => setActionModal(null)}>
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Client</span><span className="font-medium text-gray-900">{actionModal.client_name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Lot</span><span className="font-medium">{actionModal.lot_number} · {actionModal.section}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Serial</span><span className="font-mono text-xs">{actionModal.serial_number || `#${actionModal.id}`}</span></div>
          </div>
          <p className="text-sm text-gray-600 mb-5">This will change the reservation status to <span className="font-medium text-red-600">Occupied</span>.</p>
          <div className="flex gap-3">
            <button onClick={() => setActionModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleOccupy} disabled={processing} className="btn-primary flex-1">
              {processing ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
