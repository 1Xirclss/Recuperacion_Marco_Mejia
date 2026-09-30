import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { publicUser } from "./register.controller.js";
import VerificationCode from "../models/VerificationCode.js";
import { deleteImage } from "../utils/cloudinaryUpload.js";

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const getUsers = async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json({ ok: true, count: users.length, users: users.map(publicUser) });
  } catch (error) { return next(error); }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) { return next(error); }
};

export const updateUser = async (req, res, next) => {
  let newPublicId = req.file?.filename;
  const reject = async (status, message) => {
    if (newPublicId) await deleteImage(newPublicId).catch(() => {});
    return res.status(status).json({ ok: false, message });
  };

  try {
    const user = await User.findById(req.params.id).select("+password");
    if (!user) return reject(404, "Usuario no encontrado");
    const oldPublicId = user.cloudinaryPublicId;

    if (req.body.name?.trim()) user.name = req.body.name.trim();
    if (req.body.apellido?.trim()) user.apellido = req.body.apellido.trim();
    if (req.body.telefono?.trim()) user.telefono = req.body.telefono.trim();
    if (req.body.fechaNacimiento) {
      const birthDate = new Date(req.body.fechaNacimiento);
      if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
        return reject(400, "fechaNacimiento debe ser una fecha valida y no futura");
      }
      user.fechaNacimiento = birthDate;
    }
    if (req.body.email?.trim()) {
      const email = req.body.email.trim().toLowerCase();
      if (!validEmail(email)) return reject(400, "Ingresa un correo valido");
      user.email = email;
    }
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return reject(400, "La contrasena debe tener al menos 6 caracteres");
      }
      user.password = await bcrypt.hash(req.body.password, 10);
    }
    if (req.file) {
      user.fotoPerfil = req.file.path;
      user.cloudinaryPublicId = newPublicId;
    }
    await user.save();
    if (newPublicId) await deleteImage(oldPublicId).catch(() => {});
    return res.json({ ok: true, message: "Usuario actualizado", user: publicUser(user) });
  } catch (error) {
    if (newPublicId) await deleteImage(newPublicId).catch(() => {});
    return next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    await VerificationCode.deleteOne({ email: user.email });
    await deleteImage(user.cloudinaryPublicId).catch(() => {});
    return res.json({ ok: true, message: "Usuario e imagen eliminados" });
  } catch (error) { return next(error); }
};
