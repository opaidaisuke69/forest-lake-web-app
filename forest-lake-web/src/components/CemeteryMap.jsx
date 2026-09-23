import { APIProvider, Map, AdvancedMarker, Polygon, useMap } from '@vis.gl/react-google-maps';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import StatusBadge from './StatusBadge';
import api from '../utils/api';
import forestLakeLogo from '../assets/global/forest-lake-logo.png';

const API_KEY = 'AIzaSyAYMxiPynLx-KZ7udjt382QPsgadmzh7HM';
const CENTER = { lat: 10.602369, lng: 122.935156 };
const MAP_ID = 'forest_lake_map';

const RESTRICTION = {
  north: 10.604334,
  south: 10.600404,
  east: 122.937550,
  west: 122.932761,
};

const pinColors = {
  available: '#22c55e',
  reserved: '#f59e0b',
  occupied: '#ef4444',
};

// Block and Section boundaries traced from actual road coordinates
// Grid intersection points (5 rows × 3 columns):
// Row 0: (10.602855,122.933668) (10.603024,122.933954) (10.603202,122.934230)
// Row 1: (10.602651,122.933834) (10.602848,122.934086) (10.603053,122.934348)
// Row 2: (10.602389,122.934037) (10.602589,122.934297) (10.602791,122.934561)
// Row 3: (10.602129,122.934249) (10.602334,122.934504) (10.602535,122.934765)
// Row 4: (10.601831,122.934577) (10.602054,122.934740) (10.602324,122.934940)

const BLOCK_BOUNDARIES = [
  { name: 'Aster Estate A',
    paths: [
      { lat: 10.602855, lng: 122.933668 },
      { lat: 10.603024, lng: 122.933954 },
      { lat: 10.603202, lng: 122.934230 },
      { lat: 10.603053, lng: 122.934348 },
      { lat: 10.602791, lng: 122.934561 },
      { lat: 10.602535, lng: 122.934765 },
      { lat: 10.602324, lng: 122.934940 },
      { lat: 10.602054, lng: 122.934740 },
      { lat: 10.601831, lng: 122.934577 },
      { lat: 10.601920, lng: 122.934416 },
      { lat: 10.602129, lng: 122.934249 },
      { lat: 10.602389, lng: 122.934037 },
      { lat: 10.602651, lng: 122.933834 },
    ],
  },
  { name: 'Aster Estate B',
    paths: [
      { lat: 10.603251, lng: 122.934306 },
      { lat: 10.603534, lng: 122.934750 },
      { lat: 10.603806, lng: 122.935208 },
      { lat: 10.603479, lng: 122.935378 },
      { lat: 10.603145, lng: 122.935542 },
      { lat: 10.603138, lng: 122.935544 },
      { lat: 10.602749, lng: 122.935259 },
      { lat: 10.602397, lng: 122.934993 },
      { lat: 10.602665, lng: 122.934780 },
      { lat: 10.602954, lng: 122.934542 },
    ],
  },
  { name: 'Aster Estate C',
    paths: [
      { lat: 10.603091, lng: 122.935621 },
      { lat: 10.602897, lng: 122.935943 },
      { lat: 10.602697, lng: 122.936258 },
      { lat: 10.602687, lng: 122.936267 },
      { lat: 10.602092, lng: 122.936206 },
      { lat: 10.601830, lng: 122.936176 },
      { lat: 10.602015, lng: 122.935757 },
      { lat: 10.602170, lng: 122.935403 },
      { lat: 10.602336, lng: 122.935053 },
      { lat: 10.602707, lng: 122.935327 },
    ],
  },
  { name: 'Aster Estate D',
    paths: [
      { lat: 10.601958, lng: 122.935683 },
      { lat: 10.601808, lng: 122.935660 },
      { lat: 10.601612, lng: 122.936097 },
      { lat: 10.601746, lng: 122.936152 },
    ],
  },
  { name: 'Aster Estate E',
    paths: [
      { lat: 10.601736, lng: 122.935642 },
      { lat: 10.601197, lng: 122.935556 },
      { lat: 10.601182, lng: 122.935922 },
      { lat: 10.601552, lng: 122.936074 },
    ],
  },
];

const SECTION_BOUNDARIES = [
  // Section A (top-left)
  { name: 'A', paths: [
    { lat: 10.602855, lng: 122.933668 },
    { lat: 10.603024, lng: 122.933954 },
    { lat: 10.602848, lng: 122.934086 },
    { lat: 10.602651, lng: 122.933834 },
  ]},
  // Section B (top-right)
  { name: 'B', paths: [
    { lat: 10.603024, lng: 122.933954 },
    { lat: 10.603202, lng: 122.934230 },
    { lat: 10.603053, lng: 122.934348 },
    { lat: 10.602848, lng: 122.934086 },
  ]},
  // Section D (row2-left)
  { name: 'D', paths: [
    { lat: 10.602651, lng: 122.933834 },
    { lat: 10.602848, lng: 122.934086 },
    { lat: 10.602589, lng: 122.934297 },
    { lat: 10.602389, lng: 122.934037 },
  ]},
  // Section C (row2-right)
  { name: 'C', paths: [
    { lat: 10.602848, lng: 122.934086 },
    { lat: 10.603053, lng: 122.934348 },
    { lat: 10.602791, lng: 122.934561 },
    { lat: 10.602589, lng: 122.934297 },
  ]},
  // Section E (row3-left)
  { name: 'E', paths: [
    { lat: 10.602389, lng: 122.934037 },
    { lat: 10.602589, lng: 122.934297 },
    { lat: 10.602334, lng: 122.934504 },
    { lat: 10.602129, lng: 122.934249 },
  ]},
  // Section F (row3-right)
  { name: 'F', paths: [
    { lat: 10.602589, lng: 122.934297 },
    { lat: 10.602791, lng: 122.934561 },
    { lat: 10.602535, lng: 122.934765 },
    { lat: 10.602334, lng: 122.934504 },
  ]},
  // Section H (bottom-left)
  { name: 'H', paths: [
    { lat: 10.602129, lng: 122.934249 },
    { lat: 10.602334, lng: 122.934504 },
    { lat: 10.602054, lng: 122.934740 },
    { lat: 10.601831, lng: 122.934577 },
    { lat: 10.601920, lng: 122.934416 },
  ]},
  // Section G (bottom-right)
  { name: 'G', paths: [
    { lat: 10.602334, lng: 122.934504 },
    { lat: 10.602535, lng: 122.934765 },
    { lat: 10.602324, lng: 122.934940 },
    { lat: 10.602054, lng: 122.934740 },
  ]},
  // === Aster Estate B (Right area) - 2 columns × 3 rows ===
  // Section I (top-left)
  { name: 'I', paths: [
    { lat: 10.603251, lng: 122.934306 },
    { lat: 10.603534, lng: 122.934750 },
    { lat: 10.603212, lng: 122.934951 },
    { lat: 10.602954, lng: 122.934542 },
  ]},
  // Section J (top-right)
  { name: 'J', paths: [
    { lat: 10.603534, lng: 122.934750 },
    { lat: 10.603806, lng: 122.935208 },
    { lat: 10.603479, lng: 122.935378 },
    { lat: 10.603212, lng: 122.934951 },
  ]},
  // Section K (middle-left)
  { name: 'K', paths: [
    { lat: 10.602954, lng: 122.934542 },
    { lat: 10.603212, lng: 122.934951 },
    { lat: 10.602907, lng: 122.935155 },
    { lat: 10.602665, lng: 122.934780 },
  ]},
  // Section L (middle-right)
  { name: 'L', paths: [
    { lat: 10.603212, lng: 122.934951 },
    { lat: 10.603479, lng: 122.935378 },
    { lat: 10.603145, lng: 122.935542 },
    { lat: 10.602907, lng: 122.935155 },
  ]},
  // Section M (bottom-left)
  { name: 'M', paths: [
    { lat: 10.602665, lng: 122.934780 },
    { lat: 10.602907, lng: 122.935155 },
    { lat: 10.602749, lng: 122.935259 },
    { lat: 10.602397, lng: 122.934993 },
  ]},
  // Section N (bottom-right)
  { name: 'N', paths: [
    { lat: 10.602907, lng: 122.935155 },
    { lat: 10.603145, lng: 122.935542 },
    { lat: 10.603138, lng: 122.935544 },
    { lat: 10.602749, lng: 122.935259 },
  ]},
  // === Aster Estate C (Far right area) - 2 columns × 3 rows ===
  // Section O (top-left)
  { name: 'O', paths: [
    { lat: 10.603091, lng: 122.935621 },
    { lat: 10.602707, lng: 122.935327 },
    { lat: 10.602492, lng: 122.935637 },
    { lat: 10.602897, lng: 122.935943 },
  ]},
  // Section P (top-right)
  { name: 'P', paths: [
    { lat: 10.602707, lng: 122.935327 },
    { lat: 10.602336, lng: 122.935053 },
    { lat: 10.602170, lng: 122.935403 },
    { lat: 10.602492, lng: 122.935637 },
  ]},
  // Section Q (middle-left)
  { name: 'Q', paths: [
    { lat: 10.602897, lng: 122.935943 },
    { lat: 10.602492, lng: 122.935637 },
    { lat: 10.602276, lng: 122.935947 },
    { lat: 10.602697, lng: 122.936258 },
  ]},
  // Section R (middle-right)
  { name: 'R', paths: [
    { lat: 10.602492, lng: 122.935637 },
    { lat: 10.602170, lng: 122.935403 },
    { lat: 10.602015, lng: 122.935757 },
    { lat: 10.602276, lng: 122.935947 },
  ]},
  // Section S (bottom-left)
  { name: 'S', paths: [
    { lat: 10.602697, lng: 122.936258 },
    { lat: 10.602276, lng: 122.935947 },
    { lat: 10.602092, lng: 122.936206 },
    { lat: 10.602687, lng: 122.936267 },
  ]},
  // Section T (bottom-right)
  { name: 'T', paths: [
    { lat: 10.602276, lng: 122.935947 },
    { lat: 10.602015, lng: 122.935757 },
    { lat: 10.601830, lng: 122.936176 },
    { lat: 10.602092, lng: 122.936206 },
  ]},
  // === Aster Estate D (small bottom section) ===
  { name: 'U', paths: [
    { lat: 10.601958, lng: 122.935683 },
    { lat: 10.601746, lng: 122.936152 },
    { lat: 10.601612, lng: 122.936097 },
    { lat: 10.601808, lng: 122.935660 },
  ]},
  // === Aster Estate E (bottom rectangular lots) ===
  // Section V (top)
  { name: 'V', paths: [
    { lat: 10.601736, lng: 122.935642 },
    { lat: 10.601197, lng: 122.935556 },
    { lat: 10.601187, lng: 122.935772 },
    { lat: 10.601648, lng: 122.935854 },
  ]},
  // Section W (bottom)
  { name: 'W', paths: [
    { lat: 10.601648, lng: 122.935854 },
    { lat: 10.601187, lng: 122.935772 },
    { lat: 10.601182, lng: 122.935922 },
    { lat: 10.601552, lng: 122.936074 },
  ]},
];

const IMAGE_BASE = 'http://localhost/ForestLake/forest-lake-api';

// Point-in-polygon ray casting algorithm
function isPointInPolygon(point, polygon) {
  let inside = false;
  const { lat, lng } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Find which section and block a coordinate falls within
export function findSectionAtPoint(lat, lng) {
  const point = { lat, lng };
  // Find section
  const section = SECTION_BOUNDARIES.find(s => isPointInPolygon(point, s.paths));
  if (!section) return null;
  // Find block
  const block = BLOCK_BOUNDARIES.find(b => isPointInPolygon(point, b.paths));
  return {
    section: section.name,
    block: block ? block.name : '',
  };
}

export { SECTION_BOUNDARIES, BLOCK_BOUNDARIES };

function LotPin({ lot, onClick, clickable = true }) {
  const color = pinColors[lot.status] || pinColors.available;
  return (
    <AdvancedMarker
      position={{ lat: parseFloat(lot.latitude), lng: parseFloat(lot.longitude) }}
      onClick={clickable ? () => onClick(lot) : undefined}
      zIndex={clickable ? 10 : 1}
    >
      <div className="flex flex-col items-center" style={{ pointerEvents: clickable ? 'auto' : 'none' }}>
        <div className="w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform" style={{ backgroundColor: color }}></div>
        <div className="w-0.5 h-2 -mt-0.5" style={{ backgroundColor: color }}></div>
      </div>
    </AdvancedMarker>
  );
}

function LotSlotGrid({ lot, owners, onViewDeceased, onSelectSlot, selectedSlot }) {
  const maxSlots = parseInt(lot.max_slots) || 8;
  // Flatten all deceased across all owners
  const allDeceased = owners.flatMap(o => (o.deceased || []).map(d => ({ ...d, owner: o })));

  // Build slots: occupied slots from deceased, rest are available
  // Also track owners without deceased for "client info" display
  const ownersWithoutDeceased = owners.filter(o => !o.deceased || o.deceased.length === 0);

  const slots = [];
  for (let i = 0; i < maxSlots; i++) {
    if (i < allDeceased.length) {
      slots.push({ status: 'occupied', deceased: allDeceased[i], owner: allDeceased[i].owner, slotNumber: i + 1 });
    } else if (i - allDeceased.length < ownersWithoutDeceased.length) {
      slots.push({ status: 'reserved', deceased: null, owner: ownersWithoutDeceased[i - allDeceased.length], slotNumber: i + 1 });
    } else {
      slots.push({ status: 'available', deceased: null, owner: null, slotNumber: i + 1 });
    }
  }

  // 4 columns x 2 rows grid layout
  const cols = 4;

  return (
    <div className="space-y-4">
      {/* Slot Grid */}
      <div className="border-2 border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {slots.map((slot, idx) => {
            const isSelected = selectedSlot === slot.slotNumber;
            const isSelectable = onSelectSlot && slot.status === 'available';

            return (
              <button
                key={idx}
                onClick={() => {
                  if (slot.deceased) onViewDeceased(slot.owner);
                  else if (isSelectable) onSelectSlot(slot.slotNumber);
                }}
                disabled={!slot.deceased && !isSelectable}
                className={`relative p-4 flex flex-col items-center justify-center min-h-[180px] transition-all border border-gray-800 ${
                  isSelected
                    ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset'
                    : slot.status === 'occupied'
                    ? 'bg-white hover:bg-red-50/50 cursor-pointer'
                    : slot.status === 'reserved'
                    ? 'bg-amber-50/30 cursor-default'
                    : isSelectable
                    ? 'bg-white hover:bg-green-50 cursor-pointer'
                    : 'bg-white cursor-default'
                }`}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}

                {/* Slot Number */}
                <span className="absolute top-2 right-2 text-[10px] font-mono text-gray-400">#{slot.slotNumber}</span>

                {/* Status Indicator Circle with Image */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 shadow-lg border-4 border-white ${
                  isSelected ? 'bg-blue-500' : slot.status === 'occupied' ? 'bg-red-500' : slot.status === 'reserved' ? 'bg-amber-400' : 'bg-green-500'
                }`}>
                  {slot.deceased?.image ? (
                    <img src={`${IMAGE_BASE}${slot.deceased.image}`} alt={slot.deceased.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <img src={forestLakeLogo} alt="Forest Lake" className="w-12 h-12 object-contain" />
                  )}
                </div>

                {/* Name */}
                <p className="text-sm font-bold text-gray-900 text-center leading-snug w-full">
                  {slot.deceased ? slot.deceased.name : slot.owner ? `${slot.owner.first_name} ${slot.owner.last_name}` : isSelected ? 'Selected' : 'Available'}
                </p>
                {/* Status Label - hide "Occupied" if deceased info exists */}
                {!(slot.status === 'occupied' && slot.deceased) && (
                  <p className={`text-xs font-semibold mt-1.5 ${
                    isSelected ? 'text-blue-600' : slot.status === 'occupied' ? 'text-red-600' : slot.status === 'reserved' ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {isSelected ? 'Your Selection' : slot.status === 'occupied' ? 'Occupied' : slot.status === 'reserved' ? 'Reserved' : 'Open'}
                  </p>
                )}
                {/* Death date for deceased */}
                {slot.deceased?.date_of_death && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    † {slot.deceased.date_of_death}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lot Details Summary */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Total Slots</span>
          <span className="text-sm font-bold text-gray-800">{maxSlots}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Occupied</span>
          <span className="text-sm font-bold text-red-600">{allDeceased.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Reserved</span>
          <span className="text-sm font-bold text-amber-600">{ownersWithoutDeceased.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Available</span>
          <span className="text-sm font-bold text-green-600">{maxSlots - allDeceased.length - ownersWithoutDeceased.length}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-3.5 h-3.5 rounded-full bg-green-500"></span> Available
        </span>
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-3.5 h-3.5 rounded-full bg-red-500"></span> Occupied
        </span>
        {onSelectSlot && (
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500"></span> Selected
          </span>
        )}
      </div>
    </div>
  );
}

function DeceasedModal({ owner, onClose }) {
  const deceased = owner.deceased || [];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const calculateAge = (birthDate, deathDate) => {
    if (!birthDate || !deathDate) return null;
    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    let age = death.getFullYear() - birth.getFullYear();
    const m = death.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) age--;
    return age;
  };

  const timeSinceDeath = (deathDate) => {
    if (!deathDate) return null;
    const death = new Date(deathDate);
    const now = new Date();
    const diffMs = now - death;
    if (diffMs < 0) return null;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;

    const months = Math.floor(days / 30.44);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} ago`;
  };

  const formatReadableDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative shrink-0 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" aria-label="Close">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {deceased.length > 0 ? (
          <div className="space-y-6">
            {deceased.map(d => {
              const age = calculateAge(d.date_of_birth, d.date_of_death);
              const sinceDeath = timeSinceDeath(d.date_of_death);
              return (
                <div key={d.id} className="text-center">
                  {/* Deceased Image */}
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-purple-100 shadow-lg">
                    {d.image ? (
                      <img src={`${IMAGE_BASE}${d.image}`} alt={d.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-purple-50 flex items-center justify-center">
                        <img src={forestLakeLogo} alt="Forest Lake" className="w-14 h-14 object-contain" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{d.name}</h3>

                  {/* Age & Time since death */}
                  {age !== null && (
                    <p className="text-sm text-purple-700 font-medium">Age at death: {age} years old</p>
                  )}
                  {sinceDeath && (
                    <p className="text-sm text-purple-700 font-medium mb-4">Passed: {sinceDeath}</p>
                  )}

                  {/* Details */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-left mt-4">
                    {d.date_of_birth && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Born</span>
                        <span className="font-medium text-gray-800">{formatReadableDate(d.date_of_birth)}</span>
                      </div>
                    )}
                    {d.date_of_death && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Died</span>
                        <span className="font-medium text-gray-800">{formatReadableDate(d.date_of_death)}</span>
                      </div>
                    )}
                    {d.burial_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Burial Date</span>
                        <span className="font-medium text-gray-800">{formatReadableDate(d.burial_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Show client info only if occupied but no deceased */
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-amber-600">{owner.first_name?.[0]}{owner.last_name?.[0]}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{owner.first_name} {owner.last_name}</h3>
            {owner.contact_number && <p className="text-sm text-gray-500 mb-4">{owner.contact_number}</p>}
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="text-sm text-gray-400">No deceased information yet</p>
              <p className="text-xs text-gray-400 mt-1">This slot is reserved but has no burial record.</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function LotModal({ lot, onClose, onReserve }) {
  const [images, setImages] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [loadingImages, setLoadingImages] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    setLoadingImages(true);
    setActiveImg(0);
    api.get(`/burial-lots/images.php?lot_id=${lot.id}`)
      .then(res => setImages(res.data.data || []))
      .catch(() => setImages([]))
      .finally(() => setLoadingImages(false));

    // Fetch owners (includes deceased info per owner)
    api.get(`/burial-lots/owners.php?lot_id=${lot.id}`)
      .then(res => setOwners(res.data.data || []))
      .catch(() => setOwners([]));
  }, [lot.id]);

  const currentImage = images[activeImg];
  const imageUrl = currentImage ? (currentImage.image_path.startsWith('http') ? currentImage.image_path : `${IMAGE_BASE}${currentImage.image_path}`) : null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 relative shrink-0 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <h3 className="text-lg font-bold text-gray-900 mb-4 pr-8">Lot {lot.lot_number} Details</h3>

          {/* Image gallery */}
          {loadingImages ? (
            <div className="rounded-xl bg-gray-100 h-64 flex items-center justify-center animate-pulse mb-6">
              <span className="text-gray-400 text-sm">Loading...</span>
            </div>
          ) : images.length > 0 ? (
            <div className="mb-6">
              <div className="rounded-xl overflow-hidden border border-gray-200 relative cursor-pointer" onClick={() => setFullscreen(true)}>
                <img src={imageUrl} alt={`Lot ${lot.lot_number}`} className="w-full h-64 object-cover hover:opacity-90 transition" />
                {currentImage?.image_type === '360' && (
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">🌐 360°</span>
                )}
                {images.length > 1 && (
                  <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">{activeImg + 1}/{images.length}</span>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                  {images.map((img, i) => {
                    const thumbUrl = img.image_path.startsWith('http') ? img.image_path : `${IMAGE_BASE}${img.image_path}`;
                    return (
                      <button key={img.id} onClick={() => setActiveImg(i)} className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition ${i === activeImg ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                        <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Status */}
          <div className="mb-4"><StatusBadge status={lot.status} /></div>

          {/* Lot Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
            <DetailRow label="Lot Number" value={lot.lot_number} />
            <DetailRow label="Type" value={LOT_TYPE_LABELS[lot.lot_type] || 'Lawn Lot'} />
            <DetailRow label="Block" value={lot.block} />
            <DetailRow label="Section" value={lot.section} />
            <DetailRow label="Area" value={lot.square_meter ? `${lot.square_meter} m²` : '—'} />
            <DetailRow label="Slots" value={`${lot.max_slots || 8}`} />
            <DetailRow label="Price" value={formatPrice(lot.price)} />
          </div>

          {lot.description && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700">{lot.description}</p>
            </div>
          )}

          {/* Lot Slot Grid - Visual Occupation Status */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lot Slots ({lot.max_slots || 8})</p>
            {onReserve && lot.status === 'available' && (
              <p className="text-sm text-blue-600 mb-3 font-medium">👆 Select an available slot to reserve</p>
            )}
            <LotSlotGrid
              lot={lot}
              owners={owners}
              onViewDeceased={setSelectedOwner}
              onSelectSlot={onReserve && lot.status === 'available' ? (slotNum) => setSelectedSlot(slotNum === selectedSlot ? null : slotNum) : undefined}
              selectedSlot={selectedSlot}
            />
          </div>

          {/* Deceased Information - removed, now shown per owner */}

          {/* Reserve Button */}
          {onReserve && lot.status === 'available' && (
            <button
              onClick={() => { onReserve(lot, selectedSlot); onClose(); }}
              disabled={!selectedSlot}
              className={`w-full flex items-center justify-center gap-2 mt-2 py-3 rounded-xl font-semibold transition ${
                selectedSlot ? 'btn-primary' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              {selectedSlot ? `Reserve Slot #${selectedSlot}` : 'Select a slot to reserve'}
            </button>
          )}
        </div>
      </div>

      {/* Deceased Info Modal for selected owner */}
      {selectedOwner && (
        <DeceasedModal owner={selectedOwner} onClose={() => setSelectedOwner(null)} />
      )}

      {/* Fullscreen Image Lightbox */}
      {fullscreen && imageUrl && (
        <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4" onClick={() => setFullscreen(false)}>
          <button className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10" onClick={() => setFullscreen(false)}>&times;</button>
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setActiveImg(i => (i - 1 + images.length) % images.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white w-10 h-10 rounded-full text-lg transition">&lt;</button>
              <button onClick={(e) => { e.stopPropagation(); setActiveImg(i => (i + 1) % images.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white w-10 h-10 rounded-full text-lg transition">&gt;</button>
            </>
          )}
          <img src={imageUrl} alt={`Lot ${lot.lot_number}`} className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

const LOT_TYPE_LABELS = {
  lawn: 'Lawn Lot',
  mini_mausoleum: 'Mini-Mausoleum',
  estate: 'Estate Lot',
  legacy: 'Legacy Lot',
};

function formatPrice(price) {
  if (price === null || price === undefined || price === '' || Number(price) <= 0) return '—';
  return `₱${Number(price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '—'}</span>
    </div>
  );
}

const ENTRANCE = { lat: 10.602262, lng: 122.933803 };

// Road network nodes (intersections/waypoints along cemetery roads)
const ROAD_NODES = [
  { lat: 10.602262, lng: 122.933803 },  // 0: Entrance gate
  { lat: 10.602451, lng: 122.933921 },  // 1
  { lat: 10.602723, lng: 122.933711 },  // 2
  { lat: 10.602857, lng: 122.933607 },  // 3
  { lat: 10.602232, lng: 122.934106 },  // 4
  { lat: 10.601993, lng: 122.934299 },  // 5
  { lat: 10.601890, lng: 122.934393 },  // 6
  { lat: 10.601782, lng: 122.934575 },  // 7
  { lat: 10.601930, lng: 122.934706 },  // 8
  { lat: 10.602146, lng: 122.934859 },  // 9
  { lat: 10.602312, lng: 122.934999 },  // 10
  { lat: 10.602478, lng: 122.934881 },  // 11
  { lat: 10.602679, lng: 122.934709 },  // 12
  { lat: 10.602916, lng: 122.934516 },  // 13
  { lat: 10.603154, lng: 122.934315 },  // 14
  { lat: 10.602974, lng: 122.933784 },  // 15
  { lat: 10.603153, lng: 122.934076 },  // 16
  { lat: 10.603272, lng: 122.934256 },  // 17
  { lat: 10.603427, lng: 122.934497 },  // 18
  { lat: 10.603694, lng: 122.934937 },  // 19
  { lat: 10.603859, lng: 122.935229 },  // 20
  { lat: 10.603661, lng: 122.935329 },  // 21
  { lat: 10.603302, lng: 122.935514 },  // 22
  { lat: 10.603149, lng: 122.935600 },  // 23
  { lat: 10.602936, lng: 122.935456 },  // 24
  { lat: 10.602577, lng: 122.935183 },  // 25
  { lat: 10.602320, lng: 122.934997 },  // 26
  { lat: 10.602113, lng: 122.934842 },  // 27
  { lat: 10.601894, lng: 122.934681 },  // 28
  { lat: 10.602213, lng: 122.935206 },  // 29
  { lat: 10.602074, lng: 122.935520 },  // 30
  { lat: 10.602007, lng: 122.935656 },  // 31
  { lat: 10.601907, lng: 122.935892 },  // 32
  { lat: 10.601777, lng: 122.936189 },  // 33
  { lat: 10.601680, lng: 122.935872 },  // 34
  { lat: 10.601434, lng: 122.935556 },  // 35
  { lat: 10.601334, lng: 122.936033 },  // 36
  { lat: 10.601144, lng: 122.935950 },  // 37
  { lat: 10.601173, lng: 122.935510 },  // 38
  { lat: 10.601163, lng: 122.935685 },  // 39
  { lat: 10.601144, lng: 122.935829 },  // 40
  { lat: 10.601971, lng: 122.936231 },  // 41
  { lat: 10.602308, lng: 122.936277 },  // 42
  { lat: 10.602705, lng: 122.936294 },  // 43
  { lat: 10.602839, lng: 122.936122 },  // 44
  { lat: 10.603045, lng: 122.935790 },  // 45
  { lat: 10.603149, lng: 122.935590 },  // 46
  // Section U road
  { lat: 10.602013, lng: 122.935657 },  // 47 (U start - top)
  { lat: 10.601884, lng: 122.935925 },  // 48 (U end)
  // Section V road
  { lat: 10.602009, lng: 122.935646 },  // 49 (V start - top)
  { lat: 10.601545, lng: 122.935577 },  // 50 (V end - bottom)
  // Section W road
  { lat: 10.602011, lng: 122.935657 },  // 51 (W start)
  { lat: 10.601776, lng: 122.935622 },  // 52 (W mid)
  { lat: 10.601628, lng: 122.935968 },  // 53 (W end)
];

// Define road connections (which nodes connect to which via roads)
const ROAD_EDGES = [
  // === Road 1: Entrance heading NW ===
  [0, 1],
  [1, 2],
  [2, 3],

  // === Road 2: Entrance heading SE (left side of Estate A) ===
  [1, 4],
  [4, 5],
  [5, 6],
  [6, 7],

  // === Road 3: Bottom road of Estate A (going NE from node 7) ===
  [7, 8],
  [8, 9],
  [9, 10],

  // === Road 4: Internal road of Estate A going NW from node 10 ===
  [10, 11],
  [11, 12],
  [12, 13],
  [13, 14],

  // === Road 5: Top NW road (from node 3 heading NE along top) ===
  [3, 15],
  [15, 16],
  [16, 17],
  [17, 14],

  // === Road 6: Estate B diagonal road (NE from node 17) ===
  [17, 18],
  [18, 19],
  [19, 20],

  // === Road 7: Estate B right edge (going S from node 20) ===
  [20, 21],
  [21, 22],
  [22, 23],

  // === Road 8: Estate B bottom road (going SW from node 23) ===
  [23, 24],
  [24, 25],
  [25, 26],
  [26, 27],
  [27, 28],

  // === Connection: node 10 to node 26 (center junction) ===
  [10, 26],

  // === Road 9: From center junction (26) going SE toward Estate C ===
  [26, 29],
  [29, 30],
  [30, 31],
  [31, 32],
  [32, 33],

  // === Road 10: Estate C right edge going S (from node 23/46) ===
  [23, 46],
  [46, 45],
  [45, 44],
  [44, 43],
  [43, 42],
  [42, 41],
  [41, 33],

  // === Road 11: Left-side road going south from node 30 to Estates D/E/U/V/W ===
  // This is the road on the west border of D and E
  [30, 47],
  [47, 49],
  [49, 52],
  [52, 50],
  [50, 38],
  [38, 37],

  // === Road 12: Estate E bottom/right perimeter ===
  [38, 39],
  [39, 40],
  [40, 36],
  [36, 37],

  // === Road 13: Section U (branch east from node 47) ===
  [47, 48],

  // === Road 14: Section W (branch east from node 52) ===
  [52, 53],

  // === Road 15: Estate D right-side access (from C right edge via node 33) ===
  [33, 34],
  [34, 41],

  // === Road 16: Estate E right-side access (from node 35/36) ===
  [35, 36],
  [34, 35],
];

// Build adjacency list from edges
function buildGraph() {
  const adj = {};
  for (let i = 0; i < ROAD_NODES.length; i++) adj[i] = [];
  for (const [a, b] of ROAD_EDGES) {
    const dist = Math.sqrt(Math.pow(ROAD_NODES[a].lat - ROAD_NODES[b].lat, 2) + Math.pow(ROAD_NODES[a].lng - ROAD_NODES[b].lng, 2));
    adj[a].push({ node: b, dist });
    adj[b].push({ node: a, dist });
  }
  return adj;
}

const ROAD_GRAPH = buildGraph();

// Dijkstra's shortest path
function dijkstra(startIdx, endIdx) {
  const dist = Array(ROAD_NODES.length).fill(Infinity);
  const prev = Array(ROAD_NODES.length).fill(-1);
  const visited = new Set();
  dist[startIdx] = 0;

  for (let i = 0; i < ROAD_NODES.length; i++) {
    let u = -1;
    for (let j = 0; j < ROAD_NODES.length; j++) {
      if (!visited.has(j) && (u === -1 || dist[j] < dist[u])) u = j;
    }
    if (u === -1 || dist[u] === Infinity) break;
    visited.add(u);
    if (u === endIdx) break;

    for (const { node: v, dist: w } of ROAD_GRAPH[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    }
  }

  const path = [];
  let cur = endIdx;
  while (cur !== -1) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path[0] === startIdx ? path : [startIdx];
}

// Find the closest road node to a given point
function findClosestNode(point) {
  let minDist = Infinity;
  let closest = 0;
  const lat = parseFloat(point.lat);
  const lng = parseFloat(point.lng);
  for (let i = 0; i < ROAD_NODES.length; i++) {
    const d = Math.pow(lat - ROAD_NODES[i].lat, 2) + Math.pow(lng - ROAD_NODES[i].lng, 2);
    if (d < minDist) {
      minDist = d;
      closest = i;
    }
  }
  return closest;
}

// Build route from entrance to destination following roads
function findRoute(destination) {
  const destNodeIdx = findClosestNode(destination);
  const pathIndices = dijkstra(0, destNodeIdx);
  const route = pathIndices.map(i => ROAD_NODES[i]);
  route.push({ lat: parseFloat(destination.lat), lng: parseFloat(destination.lng) });
  return route;
}

function RouteLine({ destination }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !destination) return;

    const route = findRoute(destination);

    const polyline = new google.maps.Polyline({
      path: route,
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    });

    // Entrance marker
    const entranceMarker = new google.maps.Marker({
      position: ENTRANCE,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: 'Entrance',
    });

    return () => {
      polyline.setMap(null);
      entranceMarker.setMap(null);
    };
  }, [map, destination]);

  return null;
}

export default function CemeteryMap({ lots = [], height = '500px', onMapClick, isAdmin = false, onReserve, focusLotId, focusCoords }) {
  const [selectedLot, setSelectedLot] = useState(null);
  const isEditMode = !!onMapClick;

  // Auto-open modal for focused lot
  useEffect(() => {
    if (focusLotId && lots.length > 0) {
      const lot = lots.find(l => l.id == focusLotId);
      if (lot) setSelectedLot(lot);
    }
  }, [focusLotId, lots]);

  // Focus on coordinates from search (only draw route, don't open modal)
  useEffect(() => {
    if (focusCoords && focusCoords.lotId && lots.length > 0) {
      // Don't open modal on search - just draw the route line
    }
  }, [focusCoords, lots]);

  const openModal = (lot) => {
    setSelectedLot(lot);
  };

  const closeModal = () => {
    setSelectedLot(null);
  };

  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={CENTER}
          defaultZoom={17}
          mapId={MAP_ID}
          mapTypeId="satellite"
          style={{ width: '100%', height: '100%' }}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          restriction={{ latLngBounds: RESTRICTION, strictBounds: true }}
          minZoom={17}
          maxZoom={21}
          styles={[
            { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'administrative', stylers: [{ visibility: 'off' }] },
            { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
            { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ]}
          onClick={(e) => {
            if (onMapClick && e.detail?.latLng) {
              onMapClick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
            }
          }}
        >
          {/* Block borders */}
          {BLOCK_BOUNDARIES.map((block) => (
            <Polygon
              key={block.name}
              paths={block.paths}
              fillColor={isAdmin ? "#ff0000" : "#ffffff"}
              fillOpacity={isAdmin ? 0.03 : 0.01}
              strokeColor={isAdmin ? "#ef4444" : "#ffffff"}
              strokeWeight={isAdmin ? 3 : 1.5}
              strokeOpacity={isAdmin ? 0.9 : 0.3}
            />
          ))}

          {/* Section borders */}
          {SECTION_BOUNDARIES.map((section) => (
            <Polygon
              key={section.name}
              paths={section.paths}
              fillColor={isAdmin ? "#ff0000" : "#ffffff"}
              fillOpacity={isAdmin ? 0.05 : 0.01}
              strokeColor={isAdmin ? "#ef4444" : "#ffffff"}
              strokeWeight={isAdmin ? 2 : 1}
              strokeOpacity={isAdmin ? 0.8 : 0.2}
            />
          ))}

          {/* Section and block labels */}
          {SECTION_BOUNDARIES.map((section) => {
            const centerLat = section.paths.reduce((sum, p) => sum + p.lat, 0) / section.paths.length;
            const centerLng = section.paths.reduce((sum, p) => sum + p.lng, 0) / section.paths.length;
            return (
              <AdvancedMarker key={`label-${section.name}`} position={{ lat: centerLat, lng: centerLng }} zIndex={5}>
                <div className={`font-bold pointer-events-none ${isAdmin ? 'text-sm bg-white/80 text-red-700 px-2 py-1 rounded shadow-sm border border-red-200' : 'text-lg text-white/60 drop-shadow-md'}`}>
                  {section.name}
                </div>
              </AdvancedMarker>
            );
          })}
          {BLOCK_BOUNDARIES.map((block) => {
            const centerLat = block.paths.reduce((sum, p) => sum + p.lat, 0) / block.paths.length;
            const centerLng = block.paths.reduce((sum, p) => sum + p.lng, 0) / block.paths.length;
            return (
              <AdvancedMarker key={`block-label-${block.name}`} position={{ lat: centerLat, lng: centerLng }} zIndex={4}>
                <div className={`font-bold pointer-events-none ${isAdmin ? 'text-xs bg-red-600 text-white px-2 py-0.5 rounded shadow' : 'text-xl text-white/50 drop-shadow-lg'}`}>
                  {block.name}
                </div>
              </AdvancedMarker>
            );
          })}

          {lots.map(lot => (
            lot.latitude && lot.longitude && (
              <LotPin key={lot.id} lot={lot} onClick={openModal} clickable={!isEditMode} />
            )
          ))}

          {/* Route line from entrance to focused lot (search only) */}
          {focusCoords && focusCoords.lat && focusCoords.lng && (
            <RouteLine destination={focusCoords} />
          )}
        </Map>
      </APIProvider>

      {selectedLot && !isEditMode && createPortal(
        <LotModal lot={selectedLot} onClose={closeModal} onReserve={onReserve} />,
        document.body
      )}
    </div>
  );
}
