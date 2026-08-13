import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

export default function MapSearch({ onSelectLot, onGetDirections }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ lots: [], deceased: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ lots: [], deceased: [] });
      setShowDropdown(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api.get(`/burial-lots/search.php?q=${encodeURIComponent(query)}`)
        .then(res => {
          setResults(res.data || { lots: [], deceased: [] });
          setShowDropdown(true);
        })
        .catch(() => setResults({ lots: [], deceased: [] }))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (lat, lng, lotId, label) => {
    setShowDropdown(false);
    setQuery(label);
    if (onSelectLot) onSelectLot({ lat: parseFloat(lat), lng: parseFloat(lng), lotId });
  };

  const handleDirections = (lat, lng, label) => {
    // Open Google Maps directions in a new tab
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
    if (onGetDirections) onGetDirections({ lat: parseFloat(lat), lng: parseFloat(lng) });
  };

  const hasResults = results.lots.length > 0 || results.deceased.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg">
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hasResults && setShowDropdown(true)}
          placeholder="Search deceased person or lot number..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden max-h-[400px] overflow-y-auto">
          {/* Deceased Results */}
          {results.deceased.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">Deceased Persons</p>
              {results.deceased.map(d => (
                <div key={`d-${d.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                  <button onClick={() => handleSelect(d.latitude, d.longitude, d.lot_id, d.name)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">
                      {d.image ? (
                        <img src={`http://localhost/ForestLake/forest-lake-api${d.image}`} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        d.name?.[0]
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">Lot {d.lot_number} · Section {d.section}</p>
                    </div>
                  </button>
                  {d.latitude && d.longitude && (
                    <button onClick={() => handleDirections(d.latitude, d.longitude, d.name)} className="shrink-0 ml-2 p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Get Directions">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Lot Results */}
          {results.lots.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">Burial Lots</p>
              {results.lots.map(l => (
                <div key={`l-${l.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                  <button onClick={() => handleSelect(l.latitude, l.longitude, l.id, `Lot ${l.lot_number}`)} className="flex items-center gap-3 flex-1 text-left">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${l.status === 'available' ? 'bg-green-500' : l.status === 'reserved' ? 'bg-amber-500' : 'bg-red-500'}`}>
                      {l.lot_number}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Lot {l.lot_number}</p>
                      <p className="text-xs text-gray-500">Section {l.section} · Block {l.block}</p>
                    </div>
                  </button>
                  {l.latitude && l.longitude && (
                    <button onClick={() => handleDirections(l.latitude, l.longitude, `Lot ${l.lot_number}`)} className="shrink-0 ml-2 p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Get Directions">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {showDropdown && !hasResults && query.length >= 2 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 p-6 text-center">
          <p className="text-sm text-gray-400">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
