import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

// Archivo .wav en carpeta public
const finishSound = new Audio('/finish.wav');

export const ExerciseCard = ({ exercise, isTraining }) => {
  const { user } = useAuth();
  const userName = user?.displayName?.split(' ')[0] || 'Atleta';
  
  const storageKey = `series_${exercise.dia}_${exercise.ejercicio}`;
  const finalKey = `finalized_${exercise.dia}_${exercise.ejercicio}`;
  const dateKey = `date_${exercise.dia}_${exercise.ejercicio}`;
  const todayStr = new Date().toDateString();

  const [weight, setWeight] = useState(exercise.pesoprestablecido || '');
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
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false); // Estado para la alarma sonora
  const [isFinalized, setIsFinalized] = useState(() => localStorage.getItem(finalKey) === 'true');

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(seriesLog));
    localStorage.setItem(dateKey, todayStr);
  }, [seriesLog, storageKey, dateKey, todayStr]);

  const getRestSeconds = () => {
    const raw = exercise.descansoprestablecido || exercise.descanso || "90";
    const cleaned = String(raw).replace(/[^0-9]/g, ""); 
    return parseInt(cleaned) || 90;
  };

  // Función para detener el sonido
  const stopAlarm = () => {
    finishSound.pause();
    finishSound.currentTime = 0;
    setIsAlarmPlaying(false);
  };

  useEffect(() => {
    let interval;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft <= 0 && isActive) {
      setIsActive(false);
      setIsAlarmPlaying(true); // Activa el botón de detener

      // Reproducir sonido en bucle
      finishSound.loop = true;
      finishSound.play().catch(e => console.log("Audio bloqueado"));

      if (navigator.vibrate) navigator.vibrate([400, 200, 400]);

      if (Notification.permission === "granted") {
        new Notification("¡TIEMPO CUMPLIDO!", {
          body: `Luciano, a darle al ${exercise.ejercicio}`,
          icon: "/logo192.png",
          requireInteraction: true
        });
      }

      // Se apaga solo a los 10 segundos si no lo detuviste antes
      setTimeout(() => stopAlarm(), 10000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, exercise.ejercicio]);

  const handleOpenModal = () => {
    const text = exercise.seriesxreps || "";
    const matches = text.match(/\d+/g);
    setCurrentReps(matches && matches.length >= 2 ? matches[1] : (matches ? matches[0] : ''));
    setShowModal(true);
  };

  const saveSerie = async () => {
    if (!currentReps) return;
    try {
      await addDoc(collection(db, "entrenamientos"), {
        userId: user.uid,
        ejercicio: exercise.ejercicio,
        reps: currentReps,
        rpe: currentRPE,
        peso: weight || '0',
        fecha: serverTimestamp()
      });
    } catch (e) { console.error(e); }

    setSeriesLog([...seriesLog, { reps: parseInt(currentReps), rpe: currentRPE, weight: weight }]);
    setShowModal(false);
    setTimeLeft(getRestSeconds());
    setIsActive(true);
  };

  const handleFinalize = () => {
    setIsFinalized(true);
    localStorage.setItem(finalKey, 'true');
  };

  return (
    <div className={`bg-white border rounded-[32px] p-6 mb-4 ${isFinalized ? 'border-[#32D74B] bg-[#f0fff4]' : 'border-gray-50'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-black uppercase italic text-gray-900 tracking-tighter">{exercise.ejercicio}</h3>
          <div className="flex gap-2 mt-3">
            <span className="text-[10px] font-black text-[#32D74B] bg-[#32D74B]/10 px-3 py-1 rounded-lg">OBJ: {exercise.seriesxreps}</span>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{exercise.pesoprestablecido}KG</span>
          </div>
        </div>
      </div>

      {isFinalized ? (
        <div className="mt-4 space-y-3">
          <p className="text-[11px] font-black uppercase italic text-[#32D74B]">¡OBJETIVO CUMPLIDO, {userName}! 🔥</p>
          <div className="bg-white/50 border border-gray-100 rounded-2xl p-4">
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
               <span className="absolute left-3 top-1 text-[7px] font-black text-gray-400 uppercase">PESO KG</span>
               <input type="number" value={weight} onChange={(e)=>setWeight(e.target.value)} className="w-full bg-gray-50 rounded-xl pt-5 pb-2 px-3 text-sm font-black outline-none border-2 border-transparent focus:border-[#32D74B]" />
            </div>
            <button onClick={handleOpenModal} className="bg-black text-[#32D74B] px-6 rounded-xl text-[10px] font-black uppercase italic">SERIE {seriesLog.length + 1}</button>
          </div>

          {timeLeft > 0 && (
            <div className="bg-gray-900 rounded-[24px] p-4 flex items-center justify-between shadow-lg">
              <button onClick={() => setTimeLeft(prev => Math.max(0, prev - 15))} className="w-12 h-12 bg-white/10 rounded-full text-white font-black text-xs">-15</button>
              <div className="text-center">
                <p className="text-[7px] text-[#32D74B] font-black uppercase tracking-[0.2em] mb-1 italic">Descanso: {getRestSeconds()}s</p>
                <span className="text-white font-mono text-2xl font-black italic">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
              <button onClick={() => setTimeLeft(prev => prev + 15)} className="w-12 h-12 bg-white/10 rounded-full text-white font-black text-xs">+15</button>
            </div>
          )}

          {/* ESTE ES EL BOTÓN PARA APAGAR LA ALARMA */}
          {isAlarmPlaying && (
            <button 
              onClick={stopAlarm}
              className="w-full py-4 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase italic animate-bounce shadow-xl shadow-red-200"
            >
              🛑 DETENER ALARMA
            </button>
          )}

          {seriesLog.length >= (exercise.seriesxreps?.match(/\d+/)?.[0] || 3) && (
            <button onClick={handleFinalize} className="w-full py-4 bg-[#32D74B] text-black rounded-2xl text-[11px] font-black uppercase italic shadow-lg">✓ Finalizar Ejercicio</button>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-xs text-center shadow-2xl">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest italic">Repeticiones</p>
            <input type="number" autoFocus value={currentReps} onChange={(e)=>setCurrentReps(e.target.value)} className="text-8xl font-black w-full text-center outline-none mb-6 text-gray-900" />
            <div className="flex justify-between mb-8">
              {[7, 8, 9, 10].map(num => (
                <button key={num} onClick={() => setCurrentRPE(num.toString())} className={`w-12 h-12 rounded-full font-black text-sm ${currentRPE === num.toString() ? 'bg-[#32D74B] text-black' : 'bg-gray-100 text-gray-400'}`}>{num}</button>
              ))}
            </div>
            <button onClick={saveSerie} className="w-full bg-[#32D74B] text-black py-5 rounded-[24px] font-black uppercase text-xs">Guardar Serie</button>
          </div>
        </div>
      )}
    </div>
  );
};