import app from "./app.js";

const port = 6969;

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
