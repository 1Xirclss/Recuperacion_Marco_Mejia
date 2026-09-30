import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { publicUser } from "./register.controller.js";

export const login = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "email y password son obligatorios" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ ok: false, message: "Correo o contrasena incorrectos" });
    }
    if (!user.isVerified) return res.status(403).json({ ok: false, message: "Verifica tu correo antes de iniciar sesion" });

    return res.json({ ok: true, message: "Login exitoso", user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};
