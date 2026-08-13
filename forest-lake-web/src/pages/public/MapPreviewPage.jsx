import { useState, useEffect } from 'react';
import api from '../../utils/api';
import CemeteryMap from '../../components/CemeteryMap';
import MapSearch from '../../components/MapSearch';

export default function MapPreviewPage() {
  const [lots, setLots] = useState([]);
  const [focusCoords, setFocusCoords] = useState(null);

  useEffect(() => {
    api.get('/burial-lots/list.php')
      .then(res => setLots(res.data.data || []))
      .catch(() => setLots([]));
  }, []);

  return (
    <div className="animate-fade-in-up">
      {/* Hero with Image */}
      <section className="relative h-[80vh] flex items-end overflow-hidden">
        <img src="/src/assets/map/maps.jpg" alt="Cemetery Map" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        <div className="relative w-full px-8 sm:px-16 pb-20">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold text-white drop-shadow-2xl">Cemetery Map</h1>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-[60px]" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 C1300,80 1380,70 1440,60 L1440,100 L0,100 Z" fill="white" />
          </svg>
        </div>
      </section>
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">Location</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">Find a Burial Lot</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Browse available lots on our interactive map and find the perfect resting place for your loved ones.</p>
          </div>

          {/* Search Bar */}
          <div className="flex justify-center mb-8">
            <MapSearch onSelectLot={setFocusCoords} />
          </div>

          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <span className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full text-sm">
              <span className="w-3 h-3 bg-available rounded-full shadow-sm shadow-available/50"></span> Available
            </span>
            <span className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full text-sm">
              <span className="w-3 h-3 bg-occupied rounded-full shadow-sm shadow-occupied/50"></span> Occupied
            </span>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
            <CemeteryMap lots={lots} height="600px" focusCoords={focusCoords} />
          </div>
        </div>
      </section>
    </div>
  );
}
