import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import usePolling, { updateIfChanged } from '../../hooks/usePolling';
import SearchBar from '../../components/SearchBar';
import FilterDropdown from '../../components/FilterDropdown';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import toast from 'react-hot-toast';

const emptyLot = { lot_number: '', section: '', block: '', square_meter: '', max_slots: '8', lot_type: 'lawn', price: '', latitude: '', longitude: '', status: 'available', description: '' };

export default function AdminBurialLots() {
  const [lots, setLots] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [form, setForm] = useState(emptyLot);
  const [saving, setSaving] = useState(false);
  const [showUpload, setShowUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageType, setImageType] = useState('photo');
  const fileRef = useRef(null);

  const fetchLots = () => {
    api.get('/burial-lots/list.php')
      .then(res => { setLots(res.data.data || []); setFiltered(res.data.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLots(); }, []);
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

  const openAdd = () => { setEditingLot(null); setForm(emptyLot); setShowModal(true); };
  const openEdit = (lot) => { setEditingLot(lot); setForm({ ...lot }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingLot) {
        await api.put('/burial-lots/update.php', { id: editingLot.id, ...form });
        toast.success('Burial lot updated!');
      } else {
        await api.post('/burial-lots/create.php', form);
        toast.success('Burial lot created!');
      }
      setShowModal(false);
      fetchLots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this burial lot?')) return;
    try {
      await api.delete(`/burial-lots/delete.php?id=${id}`);
      toast.success('Burial lot deleted');
      fetchLots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleImageUpload = async () => {
    const files = fileRef.current?.files;
    if (!files?.length || !showUpload) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('images[]', files[i]);
    formData.append('lot_id', showUpload.id);
    formData.append('image_type', imageType);
    try {
      const res = await api.post('/burial-lots/upload-images.php', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message || 'Images uploaded!');
      setShowUpload(null);
      fetchLots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Burial Lots</h1>
          <p className="text-gray-500 mt-1">Manage all cemetery burial lots.</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Burial Lot
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1"><SearchBar onSearch={setSearch} placeholder="Search lots..." /></div>
        <FilterDropdown label="All Statuses" value={statusFilter} onChange={setStatusFilter} options={[
          { value: 'available', label: 'Available' },
          { value: 'reserved', label: 'Reserved' },
          { value: 'occupied', label: 'Occupied' },
        ]} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Lot #</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Block</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Section</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Area (m²)</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Coordinates</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Image</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(lot => (
                <tr key={lot.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-gray-900">{lot.lot_number}</td>
                  <td className="px-5 py-4 text-gray-600">{lot.block}</td>
                  <td className="px-5 py-4 text-gray-600">{lot.section}</td>
                  <td className="px-5 py-4 text-gray-600">{lot.square_meter ? `${lot.square_meter} m²` : '—'}</td>
                  <td className="px-5 py-4 text-xs text-gray-500 font-mono">{lot.latitude}, {lot.longitude}</td>
                  <td className="px-5 py-4">
                    {lot.image ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-md border border-purple-100">{lot.image_type === '360' ? '🌐 360°' : '📷 Photo'}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={lot.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(lot)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => { setShowUpload(lot); setImageType(lot.image_type || 'photo'); }} className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition" title="Upload Image">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(lot.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition" title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-16"><p className="text-gray-400 text-sm">No burial lots found.</p></div>}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editingLot ? 'Edit Burial Lot' : 'Add Burial Lot'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lot Number</label>
                <input type="text" value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })} required className="input-modern" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Block</label>
                <input type="text" value={form.block} onChange={e => setForm({ ...form, block: e.target.value })} required className="input-modern" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Section</label>
                <input type="text" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} required className="input-modern" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Area (m²)</label>
                <input type="number" step="0.01" min="0" value={form.square_meter} onChange={e => setForm({ ...form, square_meter: e.target.value })} className="input-modern" placeholder="e.g. 2.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-modern">
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="occupied">Occupied</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Slots (Deceased)</label>
                <input type="number" min="1" max="20" value={form.max_slots} onChange={e => setForm({ ...form, max_slots: e.target.value })} className="input-modern" placeholder="8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lot Type</label>
                <select value={form.lot_type} onChange={e => setForm({ ...form, lot_type: e.target.value })} className="input-modern">
                  <option value="lawn">Lawn Lot</option>
                  <option value="mini_mausoleum">Mini-Mausoleum</option>
                  <option value="estate">Estate Lot</option>
                  <option value="legacy">Legacy Lot</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₱)</label>
                <input type="number" step="0.01" min="0" value={form.price ?? ''} onChange={e => setForm({ ...form, price: e.target.value })} className="input-modern" placeholder="e.g. 75000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
                <input type="text" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="input-modern" placeholder="10.6025" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
                <input type="text" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="input-modern" placeholder="122.9345" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="2" className="input-modern resize-none"></textarea>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Saving...' : (editingLot ? 'Update Lot' : 'Create Lot')}
            </button>
          </form>
        </Modal>
      )}

      {/* Image Upload Modal */}
      {showUpload && (
        <Modal title={`Upload Images — Lot ${showUpload.lot_number}`} onClose={() => setShowUpload(null)}>
          <div className="space-y-4">
            {showUpload.image && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Current image:</p>
                <img src={`http://localhost/ForestLake/forest-lake-api${showUpload.image}`} alt="Current" className="rounded-xl max-h-32 object-cover" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Image Type</label>
              <select value={imageType} onChange={e => setImageType(e.target.value)} className="input-modern">
                <option value="photo">Regular Photo</option>
                <option value="360">360° Panoramic View</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Images</label>
              <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp" multiple className="w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-medium hover:file:bg-primary/20 file:transition-all cursor-pointer" />
              <p className="text-xs text-gray-400 mt-2">JPG, PNG, or WEBP. Max 10MB each.</p>
            </div>
            <button onClick={handleImageUpload} disabled={uploading} className="btn-primary w-full">
              {uploading ? 'Uploading...' : 'Upload Images'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
