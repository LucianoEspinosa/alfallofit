import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const RoutineContext = createContext();

export const RoutineProvider = ({ children }) => {
  const { user } = useAuth();
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsSheetId, setNeedsSheetId] = useState(false);

  const fetchRoutine = async (specificSheetId = null) => {
    if (!user) return;

    try {
      // 1. Obtener la API KEY desde Firebase Config
      const configSnap = await getDoc(doc(db, 'config', 'google_api'));
      const API_KEY = configSnap.data()?.key;

      // 2. Obtener el Sheet ID del perfil del usuario (o el provisto)
      let sheetId = specificSheetId;
      if (!sheetId) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        sheetId = userSnap.data()?.sheetId;
      }

      if (!sheetId) {
        setNeedsSheetId(true);
        setLoading(false);
        return;
      }

      const RANGE = 'Sheet1!A1:G100';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${RANGE}?key=${API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.values) {
        const rows = data.values;
        const headers = rows[0].map(h => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ''));
        
        let lastDay = "";
        const formattedData = rows.slice(1).filter(row => row.length > 0).map(row => {
          let obj = {};
          headers.forEach((header, i) => {
            let value = row[i] || "";
            if (header === 'dia') {
              if (value.trim() !== "") lastDay = value;
              else value = lastDay;
            }
            if (header.includes('descanso')) obj['descanso'] = value;
            obj[header] = value;
          });
          return obj;
        });
        setRoutine(formattedData);
        setNeedsSheetId(false);
      }
    } catch (error) {
      console.error("Error en flujo de seguridad:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSheetId = async (id) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { sheetId: id });
    fetchRoutine(id);
  };

  useEffect(() => {
    if (user) fetchRoutine();
  }, [user]);

  return (
    <RoutineContext.Provider value={{ routine, loading, needsSheetId, saveSheetId }}>
      {children}
    </RoutineContext.Provider>
  );
};

export const useRoutine = () => useContext(RoutineContext);