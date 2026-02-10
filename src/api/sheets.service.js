import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- FUNCIONES DE APOYO PARA FIREBASE ---

export const getApiKeyFromFirebase = async () => {
  try {
    const configSnap = await getDoc(doc(db, 'config', 'google_api'));
    const rawKey = configSnap.data()?.key;
    // Limpiamos comillas por si acaso
    return rawKey ? rawKey.replace(/['"]+/g, '').trim() : null;
  } catch (error) {
    console.error("Error al obtener API KEY:", error);
    return null;
  }
};

export const getUserSheetId = async (uid) => {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    return userSnap.data()?.sheetId;
  } catch (error) {
    console.error("Error al obtener Sheet ID:", error);
    return null;
  }
};

export const saveUserSheetId = async (uid, sheetId) => {
  try {
    await setDoc(doc(db, 'users', uid), { sheetId }, { merge: true });
  } catch (error) {
    console.error("Error al guardar Sheet ID:", error);
    throw error;
  }
};

// --- FUNCIÓN DE CARGA DE RUTINA ---

export const fetchRoutineFromSheets = async (spreadsheetId, apiKey) => {
  if (!spreadsheetId || !apiKey) return [];

  const SHEET_NAME = "Sheet1";
  const RANGE = `${SHEET_NAME}!A1:G100`; 
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${RANGE}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values) return [];

    let ultimoDiaVisto = "";

    // Mantenemos tu lógica de normalización de encabezados (quita acentos y espacios)
    const rawHeaders = data.values[0];
    const headers = rawHeaders.map(h => 
      h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '')
    );

    return data.values
      .slice(1) 
      .map((row) => {
        if (row[0] && row[0].trim() !== "") {
          ultimoDiaVisto = row[0].trim().toUpperCase();
        }

        let obj = { dia: ultimoDiaVisto };
        headers.forEach((header, i) => {
          let val = row[i] || '';
          
          if (header.includes('ejercicio')) obj['ejercicio'] = val;
          if (header.includes('series') || header.includes('reps')) obj['seriesxreps'] = val;
          if (header.includes('peso') || header.includes('carga')) obj['pesoprestablecido'] = val;
          
          // Ajuste para capturar tu columna G "descansoprestablecido"
          if (header.includes('descanso') || header.includes('pausa') || header.includes('rest')) {
            obj['descansoprestablecido'] = val;
            obj['descanso'] = val; // Por compatibilidad
          }
          
          if (header.includes('nota')) obj['notas'] = val;
        });
        
        return obj;
      })
      .filter(ex => ex.ejercicio && ex.ejercicio.trim() !== "" && ex.ejercicio !== "EJERCICIO");
      
  } catch (error) {
    console.error("Error en fetchRoutineFromSheets:", error);
    return [];
  }
};