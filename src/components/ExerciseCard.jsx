import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export const ExerciseCard = ({ exercise, isTraining }) => {
  const { user } = useAuth();
  
  // Inicializamos con el valor de la planilla
  const [weight, setWeight] = useState(exercise.pesoprestablecido || '');
  const [seriesLog, setSeriesLog] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentReps, setCurrentReps] = useState('');
  const [currentRPE, setCurrentRPE] = useState('8');
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinalized, setIsFinalized] = useState(() => 
    localStorage.getItem(`finalized_${exercise.dia}_${exercise.ejercicio}`) === 'true'
  );

  // EFECTO CRÍTICO: Sincroniza el peso cuando cambia el ejercicio o se carga la rutina
  useEffect(() => {
    if (exercise.pesoprestablecido) {
      setWeight(exercise.pesoprestablecido);
    }
  }, [exercise.pesoprestablecido, exercise.ejercicio]);

  const getRestSeconds = () => {
    const fromSheet = parseInt(exercise.descanso || exercise.descansoprestablecido);
    return !isNaN(fromSheet) ? fromSheet : 90;
  };

  const getSuggestedReps = () => {
    const text = exercise.seriesxreps || "";
    const matches = text.match(/\d+/g);
    if (matches && matches.length >= 2) return matches[1]; 
    if (matches && matches.length === 1) return matches[0];
    return '';
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

    await addDoc(collection(db, "entrenamientos"), {
      userId: user.uid,
      ejercicio: exercise.ejercicio,
      reps: currentReps,
      rpe: currentRPE,
      peso: weight || '0',
      fecha: serverTimestamp()
    });

    setSeriesLog([...seriesLog, { reps: currentReps, rpe: currentRPE }]);
    setShowModal(false);
    setTimeLeft(restDuration);
    setIsActive(true);
  };

  const adjustTimer = (seconds) => {
    setTimeLeft(prev => Math.max(0, prev + seconds));
    if (!isActive) setIsActive(true);
  };

  return (
    <div className={`bg-white border rounded-[32px] p-6 mb-4 ${isFinalized ? 'opacity-40 grayscale' : 'border-gray-50 shadow-sm'}`}>
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-black uppercase italic leading-none text-gray-900 tracking-tighter">
            {exercise.ejercicio}
          </h3>
          <div className="flex gap-2 mt-3">
            <span className="text-[10px] font-black text-[#32D74B] bg-[#32D74B]/10 px-3 py-1 rounded-lg uppercase">
              REPS: {exercise.seriesxreps}
            </span>
            {exercise.pesoprestablecido && (
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase">
                CARGA: {exercise.pesoprestablecido}KG
              </span>
            )}
          </div>
        </div>
      </div>

      {!isFinalized && isTraining && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
               <span className="absolute left-3 top-1 text-[7px] font-black text-gray-400 uppercase">PESO KG</span>
               <input 
                type="number" 
                value={weight} 
                onChange={(e)=>setWeight(e.target.value)} 
                className="w-full bg-gray-50 rounded-xl pt-5 pb-2 px-3 text-sm font-black outline-none border-2 border-transparent focus:border-[#32D74B]" 
              />
            </div>
            <button onClick={handleOpenModal} className="bg-black text-[#32D74B] px-6 rounded-xl text-[10px] font-black uppercase italic active:scale-95 transition-transform">
              SERIE {seriesLog.length + 1}
            </button>
          </div>

          {timeLeft > 0 && (
            <div className="bg-gray-900 rounded-[24px] p-4 flex items-center justify-between shadow-lg">
              <button onClick={() => adjustTimer(-15)} className="w-10 h-10 bg-white/10 rounded-full text-white font-black text-xs">-15</button>
              <div className="text-center">
                <p className="text-[7px] text-[#32D74B] font-black uppercase tracking-[0.2em] mb-1 italic text-center">Descanso</p>
                <span className="text-white font-mono text-2xl font-black italic">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <button onClick={() => adjustTimer(15)} className="w-10 h-10 bg-white/10 rounded-full text-white font-black text-xs">+15</button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-xs text-center shadow-2xl">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest italic text-center">Repeticiones</p>
            <input 
              type="number" autoFocus 
              value={currentReps} 
              onChange={(e)=>setCurrentReps(e.target.value)} 
              className="text-8xl font-black w-full text-center outline-none mb-6 text-gray-900" 
            />
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest italic">¿Qué tan pesado fue? (RPE)</p>
            <div className="flex justify-between mb-8">
              {[7, 8, 9, 10].map(num => (
                <button 
                  key={num} 
                  onClick={() => setCurrentRPE(num.toString())} 
                  className={`w-12 h-12 rounded-full font-black text-sm transition-all ${currentRPE === num.toString() ? 'bg-[#32D74B] text-black shadow-lg shadow-[#32D74B]/40' : 'bg-gray-100 text-gray-400'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <button 
              onClick={saveSerie} 
              className="w-full bg-[#32D74B] text-black py-5 rounded-[24px] font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
            >
              Guardar Serie
            </button>
          </div>
        </div>
      )}
    </div>
  );
};