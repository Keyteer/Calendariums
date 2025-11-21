import { Router } from "express";
import { supabase } from "../config/supabase.js";

const router = Router();

// GET /event-types
// Obtener todos los tipos de eventos disponibles
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("event_types")
      .select("name, color, icon")
      .order("name");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Si no hay tipos en la BD, devolver tipos por defecto
    if (!data || data.length === 0) {
      const defaultTypes = [
        { name: 'Clase', color: '#3B82F6', icon: 'book' },
        { name: 'Examen', color: '#EF4444', icon: 'clipboard-check' },
        { name: 'Tarea', color: '#F59E0B', icon: 'pencil' },
        { name: 'Reunión', color: '#10B981', icon: 'users' },
        { name: 'Proyecto', color: '#8B5CF6', icon: 'briefcase' },
        { name: 'Evento Social', color: '#EC4899', icon: 'heart' },
        { name: 'Otro', color: '#6B7280', icon: 'calendar' },
      ];
      return res.json({ event_types: defaultTypes, source: 'default' });
    }

    return res.json({ event_types: data, source: 'database' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
