import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- FUNCIONES DE APOYO PARA FIREBASE ---

// Obtiene la API KEY global de tu colección 'config'
export const getApiKeyFromFirebase = async () => {
  try {
    const configSnap = await getDoc(doc(db, 'config', 'google_api'));
    return configSnap.data()?.key;
  } catch (error) {
    console.error("Error al obtener API KEY:", error);
    return null;
  }
};

// Obtiene el Sheet ID guardado para el usuario actual
export const getUserSheetId = async (uid) => {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    return userSnap.data()?.sheetId;
  } catch (error) {
    console.error("Error al obtener Sheet ID:", error);
    return null;
  }
};

// Guarda el Sheet ID del usuario por primera vez
export const saveUserSheetId = async (uid, sheetId) => {
  try {
    await setDoc(doc(db, 'users', uid), { sheetId }, { merge: true });
  } catch (error) {
    console.error("Error al guardar Sheet ID:", error);
    throw error;
  }
};

// --- TU FUNCIÓN DE SIEMPRE (Pero ahora recibe parámetros) ---

export const fetchRoutineFromSheets = async (spreadsheetId, apiKey) => {
  if (!spreadsheetId || !apiKey) return [];

  const SHEET_NAME = "Sheet1";
  // Ampliamos el rango a la columna G para capturar Pesos (F) y Descansos (G)
  const RANGE = `${SHEET_NAME}!A1:G100`; 
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${RANGE}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values) return [];

    let ultimoDiaVisto = "";

    // Obtenemos los encabezados para saber qué columna es cada cosa
    const rawHeaders = data.values[0];
    const headers = rawHeaders.map(h => 
      h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '')
    );

    return data.values
      .slice(1) // Saltamos la fila de títulos
      .map((row) => {
        // Lógica de autocompletado de días
        if (row[0] && row[0].trim() !== "") {
          ultimoDiaVisto = row[0].trim().toUpperCase();
        }

        // Mapeo dinámico: busca por nombre de columna
        let obj = { dia: ultimoDiaVisto };
        headers.forEach((header, i) => {
          let val = row[i] || '';
          if (header.includes('ejercicio')) obj['ejercicio'] = val;
          if (header.includes('series') || header.includes('reps')) obj['seriesxreps'] = val;
          if (header.includes('peso')) obj['pesoprestablecido'] = val;
          if (header.includes('descanso')) obj['descanso'] = val;
          if (header.includes('nota')) obj['notas'] = val;
        });
        
        return obj;
      })
      // Solo dejamos filas que tengan un nombre de ejercicio real
      .filter(ex => ex.ejercicio && ex.ejercicio.trim() !== "" && ex.ejercicio !== "EJERCICIO");
      
  } catch (error) {
    console.error("Error en fetchRoutineFromSheets:", error);
    return [];
  }
};