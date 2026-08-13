import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import StatusBadge from './StatusBadge';

export default function LotImageViewer({ lot, onClose }) {
  const is360 = lot.image_type === '360';
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleMouseDown = (e) => {
    if (!is360) return;
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!dragging || !is360) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setRotation(prev => ({ x: prev.x - dy * 0.3, y: prev.y + dx * 0.3 }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e) => {
    if (!is360) return;
    setDragging(true);
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e) => {
    if (!dragging || !is360) return;
    const dx = e.touches[0].clientX - lastPos.current.x;
    const dy = e.touches[0].clientY - lastPos.current.y;
    setRotation(prev => ({ x: prev.x - dy * 0.3, y: prev.y + dx * 0.3 }));
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  useEffect(() => {
    const handleUp = () => setDragging(false);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  const imageUrl = lot.image ? (lot.image.startsWith('http') ? lot.image : `http://localhost/ForestLake/forest-lake-api${lot.image}`) : '';

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl relative overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Lot {lot.lot_number}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500">Section: {lot.section} · Block: {lot.block}</span>
              <StatusBadge status={lot.status} />
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Image viewer */}
        <div
          ref={containerRef}
          className="relative w-full h-[300px] sm:h-[400px] md:h-[450px] overflow-hidden bg-gray-900 select-none"
          style={{ cursor: is360 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {is360 ? (
            <div
              className="absolute inset-0 w-[200%] h-full bg-cover bg-center transition-none"
              style={{
                backgroundImage: `url(${imageUrl})`,
                transform: `translate(${-rotation.y % 100}%, ${Math.max(-30, Math.min(30, rotation.x))}%)`,
                backgroundSize: 'cover',
              }}
            />
          ) : (
            <img src={imageUrl} alt={`Lot ${lot.lot_number}`} className="w-full h-full object-cover" />
          )}

          {is360 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full border border-white/10">
              🌐 Drag to look around (360° View)
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="p-5 bg-gray-50 text-sm text-gray-600">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> {lot.latitude}, {lot.longitude}</span>
            {lot.description && <span className="text-gray-400">|</span>}
            {lot.description && <span>{lot.description}</span>}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
