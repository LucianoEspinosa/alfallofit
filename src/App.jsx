import React, { useState, useEffect } from 'react';
import Dashboard from './views/Dashboard';
import { useAuth } from './context/AuthContext';
import { 
  getApiKeyFromFirebase, 
  getUserSheetId, 
  saveUserSheetId, 
  fetchRoutineFromSheets 
} from './api/sheets.service';

function App() {
  const { user, loginWithGoogle, logout } = useAuth();
  
  // Estados de la aplicación
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsSheetId, setNeedsSheetId] = useState(false);
  const [inputSheetId, setInputSheetId] = useState('');

  // Efecto principal para cargar llaves y datos
  useEffect(() => {
    const initApp = async () => {
      if (user) {
        setLoading(true);
        try {
          // 1. Buscamos el ID de la planilla del usuario en Firestore
          const sId = await getUserSheetId(user.uid);
          
          if (!sId) {
            setNeedsSheetId(true);
            setLoading(false);
            return;
          }

          // 2. Buscamos la API KEY global en Firestore
          const aKey = await getApiKeyFromFirebase();
          
          if (aKey) {
            // 3. Traemos los datos de Google Sheets
            const data = await fetchRoutineFromSheets(sId, aKey);
            setRoutine(data);
          } else {
            console.error("No se encontró la API KEY en Firebase (colección config)");
          }
        } catch (error) {
          console.error("Error al inicializar:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    initApp();
  }, [user]);

  // Función para vincular la planilla por primera vez
  const handleVincularPlanilla = async () => {
    if (!inputSheetId.trim()) return;
    try {
      setLoading(true);
      await saveUserSheetId(user.uid, inputSheetId.trim());
      // Forzamos recarga para que el useEffect dispare el flujo completo
      window.location.reload();
    } catch (error) {
      alert("Error al guardar el ID de la planilla.");
      setLoading(false);
    }
  };

  // 1. Pantalla de carga
  if (user && loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#32D74B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Sincronizando Hierro...</p>
        </div>
      </div>
    );
  }

  // 2. Pantalla de Login (Si no está autenticado)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-black text-gray-900 mb-2 italic tracking-tighter">
          AlFallo<span className="text-[#32D74B]">Fit</span>
        </h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-10">Elite Training Journal</p>
        <button 
          onClick={loginWithGoogle}
          className="bg-black text-white px-8 py-4 rounded-[24px] font-black uppercase text-xs flex items-center gap-3 shadow-2xl active:scale-95 transition-all"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.png" className="w-4" alt="G" />
          Entrar con Google
        </button>
      </div>
    );
  }

  // 3. Pantalla de Onboarding (Si no tiene planilla vinculada)
  if (needsSheetId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8 text-center">
        <div className="max-w-xs w-full">
          <h2 className="text-white text-3xl font-black italic uppercase mb-4 tracking-tighter">Configura tu<br/>Planilla</h2>
          <p className="text-gray-500 text-[10px] font-bold uppercase mb-8 tracking-widest leading-relaxed">
            Pegá el ID de tu Google Sheet para vincular tu rutina personal.
          </p>
          <input 
            type="text"
            value={inputSheetId}
            onChange={(e) => setInputSheetId(e.target.value)}
            placeholder="ID de la Planilla"
            className="w-full bg-gray-900 text-white p-4 rounded-2xl mb-4 border border-gray-800 outline-none focus:border-[#32D74B] transition-all font-mono text-xs"
          />
          <button 
            onClick={handleVincularPlanilla}
            className="w-full bg-[#32D74B] text-black py-4 rounded-2xl font-black uppercase italic shadow-lg shadow-[#32D74B]/20"
          >
            Vincular Rutina
          </button>
        </div>
      </div>
    );
  }

  // 4. Interfaz Principal
  return (
    <div className="min-h-screen bg-[#F8FAF8]">
      <header className="bg-white border-b border-gray-100 p-6 sticky top-0 z-50 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 italic tracking-tighter leading-none">
            AlFallo<span className="text-[#32D74B]">Fit</span>
          </h1>
        </div>
        <button onClick={logout} className="group">
          <img 
            src={user.photoURL} 
            alt="profile" 
            className="w-8 h-8 rounded-full border-2 border-[#32D74B] group-active:scale-90 transition-transform shadow-md" 
          />
        </button>
      </header>

      <main className="max-w-lg mx-auto pb-10">
        <Dashboard routine={routine} />
      </main>
    </div>
  );
}

export default App;