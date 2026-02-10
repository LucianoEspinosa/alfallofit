import React, { useState, useEffect } from 'react';
import { ExerciseCard } from '../components/ExerciseCard';
import { useAuth } from '../context/AuthContext';

const Dashboard = ({ routine = [] }) => {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return days[new Date().getDay()];
  });

  const [isTraining, setIsTraining] = useState(() => localStorage.getItem('isTraining') === 'true');
  const [startTime, setStartTime] = useState(() => parseInt(localStorage.getItem('startTime')) || null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const clean = (t) => t?.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() || "";
  const dailyRoutine = routine.filter(ex => clean(ex.dia) === clean(selectedDay));
  const isRestDay = dailyRoutine.some(ex => clean(ex.grupomuscular).includes("descanso") || clean(ex.ejercicio) === "—");

  useEffect(() => {
    let interval;
    if (isTraining && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTraining, startTime]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // FUNCIÓN DE LIMPIEZA CORREGIDA
  const confirmClose = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      // Borramos series, estados finalizados y registros de fecha
      if (
        key.startsWith('series_') || 
        key.startsWith('finalized_') || 
        key.startsWith('date_') ||
        key.includes('timer_')
      ) {
        localStorage.removeItem(key);
      }
    });

    localStorage.removeItem('isTraining');
    localStorage.removeItem('startTime');
    
    // Resetear estados locales para que la UI se limpie al instante
    setIsTraining(false);
    setStartTime(null);
    setShowSummary(false);
    
    window.location.reload(); // Recarga para asegurar que todo empiece de cero
  };

  return (
    <div className="min-h-screen pb-24 p-6 bg-[#F8FAF8]">
      {!isTraining && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
          {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(day => (
            <button key={day} onClick={() => setSelectedDay(day)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedDay === day ? 'bg-[#32D74B] text-black shadow-lg shadow-[#32D74B]/20' : 'bg-white text-gray-400 border border-gray-100'}`}>{day}</button>
          ))}
        </div>
      )}

      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedDay}</p>
          <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">
            {isRestDay ? 'Recuperación' : (isTraining ? 'En Sesión' : 'Tu Rutina')}
          </h2>
        </div>
        {isTraining && !isRestDay && (
          <div className="text-right bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[8px] font-black text-gray-400 uppercase">Tiempo Total</p>
            <p className="text-lg font-mono font-black text-gray-900">{formatTime(elapsedTime)}</p>
          </div>
        )}
      </div>

      {isRestDay ? (
        <div className="py-12 px-6 bg-white rounded-[40px] shadow-sm border border-gray-50 text-center">
          <span className="text-7xl block mb-4">🧘‍♂️</span>
          <h3 className="text-2xl font-black text-gray-900 uppercase italic">Hoy se descansa</h3>
          <p className="text-[#32D74B] font-black uppercase text-xs mt-2">Recuperación Total</p>
        </div>
      ) : (
        <>
          {!isTraining && (
            <button onClick={() => {
              const now = Date.now();
              setIsTraining(true); setStartTime(now);
              localStorage.setItem('isTraining','true'); localStorage.setItem('startTime', now);
            }} className="w-full bg-[#32D74B] text-black py-6 rounded-[32px] font-black uppercase italic text-lg shadow-xl mb-10">
              Iniciar Entrenamiento
            </button>
          )}
          <div className="space-y-4">
            {dailyRoutine.map((ex, i) => (
              <ExerciseCard 
                key={`${selectedDay}-${i}`} // Clave única por día para forzar refresco
                exercise={ex} 
                isTraining={isTraining} 
              />
            ))}
          </div>
        </>
      )}

      {isTraining && !isRestDay && (
        <button 
          onClick={() => setShowSummary(true)} 
          className="w-full mt-12 bg-black text-white py-5 rounded-[28px] font-black uppercase italic tracking-widest active:scale-95 transition-transform"
        >
          Finalizar Entrenamiento
        </button>
      )}

      {showSummary && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6 backdrop-blur-xl">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-sm text-center">
            <h2 className="text-3xl font-black mb-2 italic uppercase">¡Sesión Terminada!</h2>
            <div className="py-6">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Tiempo de Trabajo</p>
              <p className="text-4xl font-mono font-black text-gray-900">{formatTime(elapsedTime)}</p>
            </div>
            <button 
              onClick={confirmClose} 
              className="w-full bg-[#32D74B] text-black py-5 rounded-[24px] font-black uppercase text-xs shadow-lg shadow-[#32D74B]/20"
            >
              Guardar y Salir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;