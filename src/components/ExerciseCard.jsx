import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export const ExerciseCard = ({ exercise, isTraining }) => {
  const { user } = useAuth();
  
  // EXTRAEMOS EL NOMBRE DINÁMICO DE GOOGLE
  const userName = user?.displayName?.split(' ')[0] || 'Atleta';
  
  // Claves únicas para LocalStorage
  const storageKey = `series_${exercise.dia}_${exercise.ejercicio}`;
  const finalKey = `finalized_${exercise.dia}_${exercise.ejercicio}`;
  const dateKey = `date_${exercise.dia}_${exercise.ejercicio}`;
  const todayStr = new Date().toDateString();

  const [weight, setWeight] = useState(exercise.pesoprestablecido || '');
  
  // Carga inicial con persistencia y validación de fecha
  const [seriesLog, setSeriesLog] = useState(() => {
    const lastUpdate = localStorage.getItem(dateKey);
    if (lastUpdate !== todayStr) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(finalKey);
      return [];
    }
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  const [showModal, setShowModal] = useState(false);
  const [currentReps, setCurrentReps] = useState('');
  const [currentRPE, setCurrentRPE] = useState('8');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  const [isFinalized, setIsFinalized] = useState(() => 
    localStorage.getItem(finalKey) === 'true'
  );

  // Guardar cambios automáticamente
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(seriesLog));
    localStorage.setItem(dateKey, todayStr);
  }, [seriesLog, storageKey, dateKey, todayStr]);

  useEffect(() => {
    if (exercise.pesoprestablecido) setWeight(exercise.pesoprestablecido);
  }, [exercise.pesoprestablecido, exercise.ejercicio]);

  const getRestSeconds = () => {
    const raw = exercise.descansoprestablecido || exercise.descanso || "90";
    const cleaned = String(raw).replace(/[^0-9]/g, ""); 
    const parsed = parseInt(cleaned);
    return !isNaN(parsed) && parsed > 0 ? parsed : 90;
  };

  const getTargetSeries = () => {
    const text = String(exercise.seriesxreps || "");
    const matches = text.match(/\d+/g);
    // Si dice 4x10, toma el 4.
    return (matches && matches.length > 0) ? parseInt(matches[0]) : 3;
  };

  const getSuggestedReps = () => {
    const text = exercise.seriesxreps || "";
    const matches = text.match(/\d+/g);
    if (matches && matches.length >= 2) return matches[1]; 
    return matches ? matches[0] : '';
  };

  useEffect(() => {
    let interval;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft <= 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleOpenModal = () => {
    setCurrentReps(getSuggestedReps());
    setShowModal(true);
  };

  const saveSerie = async () => {
    if (!currentReps) return;
    const restDuration = getRestSeconds();

    try {
      await addDoc(collection(db, "entrenamientos"), {
        userId: user.uid,
        ejercicio: exercise.ejercicio,
        reps: currentReps,
        rpe: currentRPE,
        peso: weight || '0',
        fecha: serverTimestamp()
      });
    } catch (e) {
      console.error("Error al guardar en Firebase:", e);
    }

    setSeriesLog([...seriesLog, { reps: parseInt(currentReps), rpe: currentRPE, weight: weight }]);
    setShowModal(false);
    setTimeLeft(restDuration);
    setIsActive(true);
  };

  const handleFinalize = () => {
    setIsFinalized(true);
    localStorage.setItem(finalKey, 'true');
  };

  const getFeedback = () => {
    const targetReps = parseInt(getSuggestedReps());
    const reachedTarget = seriesLog.every(s => s.reps >= targetReps);
    if (reachedTarget) {
      return { msg: `¡OBJETIVO CUMPLIDO! Estás imparable, ${userName}. 🔥`, color: "text-[#32D74B]" };
    } else {
      return { msg: `Buen intento, ${userName}. ¡La próxima lo destruís! 💪`, color: "text-orange-500" };
    }
  };

  return (
    <div className={`bg-white border rounded-[32px] p-6 mb-4 transition-all ${isFinalized ? 'border-[#32D74B] shadow-lg bg-[#f0fff4]' : 'border-gray-50 shadow-sm'}`}>
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-black uppercase italic leading-none text-gray-900 tracking-tighter">
            {exercise.ejercicio}
          </h3>
          <div className="flex gap-2 mt-3">
            <span className="text-[10px] font-black text-[#32D74B] bg-[#32D74B]/10 px-3 py-1 rounded-lg uppercase">
              OBJ: {exercise.seriesxreps}
            </span>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase">
              {exercise.pesoprestablecido}KG
            </span>
          </div>
        </div>
      </div>

      {isFinalized ? (
        <div className="mt-4 space-y-3">
          <p className={`text-[11px] font-black uppercase italic ${getFeedback().color}`}>
            {getFeedback().msg}
          </p>
          <div className="bg-white/50 border border-gray-100 rounded-2xl p-4">
            <p className="text-[8px] font-bold text-gray-400 uppercase mb-2 tracking-tighter text-center">Resumen de trabajo</p>
            {seriesLog.map((s, i) => (
              <div key={i} className="flex justify-between text-[11px] font-black border-b border-gray-50 py-1 last:border-0">
                <span>S{i+1}</span>
                <span>{s.weight}kg x {s.reps} <span className="text-gray-400">@RPE{s.rpe}</span></span>
              </div>
            ))}
          </div>
        </div>
      ) : isTraining && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
               <span className="absolute left-3 top-1 text-[7px] font-black text-gray-400 uppercase tracking-tighter">PESO KG</span>
               <input 
                type="number" 
                value={weight} 
                onChange={(e)=>setWeight(e.target.value)} 
                className="w-full bg-gray-50 rounded-xl pt-5 pb-2 px-3 text-sm font-black outline-none border-2 border-transparent focus:border-[#32D74B]" 
              />
            </div>
            <button 
              onClick={handleOpenModal} 
              className="bg-black text-[#32D74B] px-6 rounded-xl text-[10px] font-black uppercase italic active:scale-95 transition-transform"
            >
              SERIE {seriesLog.length + 1}
            </button>
          </div>

          {timeLeft > 0 && (
            <div className="bg-gray-900 rounded-[24px] p-4 flex items-center justify-between shadow-lg">
              <button onClick={() => setTimeLeft(prev => Math.max(0, prev - 15))} className="w-12 h-12 bg-white/10 rounded-full text-white font-black text-xs">-15</button>
              <div className="text-center">
                <p className="text-[7px] text-[#32D74B] font-black uppercase tracking-[0.2em] mb-1 italic">Descanso: {getRestSeconds()}s</p>
                <span className="text-white font-mono text-2xl font-black italic">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <button onClick={() => setTimeLeft(prev => prev + 15)} className="w-12 h-12 bg-white/10 rounded-full text-white font-black text-xs">+15</button>
            </div>
          )}

          {seriesLog.length >= getTargetSeries() && (
            <button 
              onClick={handleFinalize} 
              className="w-full py-4 bg-[#32D74B] text-black rounded-2xl text-[11px] font-black uppercase italic shadow-lg shadow-[#32D74B]/20 animate-pulse active:scale-95 transition-all"
            >
              ✓ Finalizar Ejercicio
            </button>
          )}

          {seriesLog.length > 0 && seriesLog.length < getTargetSeries() && (
            <button 
              onClick={handleFinalize}
              className="w-full py-2 text-[8px] font-black text-gray-300 uppercase italic"
            >
              Terminar antes de tiempo
            </button>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-xs text-center shadow-2xl">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest italic">Repeticiones</p>
            <input 
              type="number" autoFocus 
              value={currentReps} 
              onChange={(e)=>setCurrentReps(e.target.value)} 
              className="text-8xl font-black w-full text-center outline-none mb-6 text-gray-900" 
            />
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest italic text-center">Esfuerzo (RPE)</p>
            <div className="flex justify-between mb-8">
              {[7, 8, 9, 10].map(num => (
                <button 
                  key={num} 
                  onClick={() => setCurrentRPE(num.toString())} 
                  className={`w-12 h-12 rounded-full font-black text-sm transition-all ${currentRPE === num.toString() ? 'bg-[#32D74B] text-black' : 'bg-gray-100 text-gray-400'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <button 
              onClick={saveSerie} 
              className="w-full bg-[#32D74B] text-black py-5 rounded-[24px] font-black uppercase text-xs"
            >
              Guardar Serie
            </button>
          </div>
        </div>
      )}
    </div>
  );
};