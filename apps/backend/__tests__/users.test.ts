import request from "supertest";
import { app } from "../src/index.js";
import { supabase } from "../src/supabase.js";

describe("INTEGRACIÓN REAL - Usuarios", () => {
  jest.setTimeout(30000);

  const FIXED_USER_ID = "a3e966d8-e1c0-41e2-9fd6-0519575c76e7";

  beforeAll(async () => {
    // Upsert para asegurar que el usuario existe
    const { error } = await supabase.from("user").upsert({
      id: FIXED_USER_ID,
      username: "UsuarioFijoTest",
      // 'testing' fallaba porque no está en el ENUM de la base de datos.
      // Usamos 'naturaleza' que es un valor seguro en tu proyecto.
      user_type: ["leisure"],
    });

    if (error) {
      console.error("⚠️ Error preparando usuario fijo:", error);
    }
  });

  it("Debe poder leer el perfil del usuario fijo", async () => {
    const res = await request(app).get(`/api/user/${FIXED_USER_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(FIXED_USER_ID);
  });

  it("Debe poder actualizar el perfil del usuario fijo", async () => {
    const nuevoNombre = `UsuarioFijo_${Date.now()}`;
    const res = await request(app)
      .patch(`/api/user/${FIXED_USER_ID}`)
      .send({ username: nuevoNombre });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe(nuevoNombre);
  });
});
