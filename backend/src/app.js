import express from "express";
// Rutas
import eventsRoutes from "./routes/events.routes.js";
import eventTypesRoutes from "./routes/event-types.routes.js";
import ollamaRoutes from "./routes/ollama.routes.js";
import groupsRoutes from "./routes/groups.routes.js";

import cors from "cors";

const app = express()
app.use(cors({
  origin: '*', // Permitir todas las conexiones en desarrollo (incluyendo web y movil)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Registrar rutas
app.use("/events", eventsRoutes);
app.use("/event-types", eventTypesRoutes);
app.use("/ollama", ollamaRoutes);
app.use("/groups", groupsRoutes);

export default app;
