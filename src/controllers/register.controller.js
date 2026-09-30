import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import User from "../models/User.js";
import VerificationCode from "../models/VerificationCode.js";
import { sendVerificationEmail } from "../services/email.service.js";
import { deleteImage } from "../utils/cloudinaryUpload.js";

const emailIsValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const requestRegistrationCode = async (req, res, next) => {
  const uploadedId = req.file?.filename;
  try {
    const { name, apellido, telefono, fechaNacimiento, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();
    if (![name, apellido, telefono, fechaNacimiento, email, password].every((value) => String(value || "").trim()) || !req.file) {
      if (uploadedId) await deleteImage(uploadedId).catch(() => {});
      return res.status(400).json({ ok: false, message: "Todos los campos y profilePhoto son obligatorios" });
    }
    if (!emailIsValid(email)) {
      if (uploadedId) await deleteImage(uploadedId).catch(() => {});
      return res.status(400).json({ ok: false, message: "Ingresa un correo valido" });
    }
    if (password.length < 6) {
      if (uploadedId) await deleteImage(uploadedId).catch(() => {});
      return res.status(400).json({ ok: false, message: "La contrasena debe tener al menos 6 caracteres" });
    }
    const birthDate = new Date(fechaNacimiento);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
      if (uploadedId) await deleteImage(uploadedId).catch(() => {});
      return res.status(400).json({ ok: false, message: "fechaNacimiento debe ser una fecha valida y no futura" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser?.isVerified) {
      if (uploadedId) await deleteImage(uploadedId).catch(() => {});
      return res.status(409).json({ ok: false, message: "Ese correo ya esta registrado" });
    }

    if (existingUser) {
      await deleteImage(existingUser.cloudinaryPublicId).catch(() => {});
      await User.deleteOne({ _id: existingUser._id });
      await VerificationCode.deleteOne({ email });
    }

    const code = crypto.randomBytes(3).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const codeHash = await bcrypt.hash(code, 10);
    const user = await User.create({
      name: name.trim(), apellido: apellido.trim(), email,
      telefono: telefono.trim(), fechaNacimiento: birthDate,
      password: await bcrypt.hash(password, 10),
      fotoPerfil: req.file.path, cloudinaryPublicId: uploadedId,
      codigoVerificacion: codeHash, codigoExpira: expiresAt,
      isVerified: false,
    });
    await VerificationCode.create({
      email, codeHash, expiersAt: expiresAt, attempts: 0,
    });
    try {
      await sendVerificationEmail(email, code);
    } catch (error) {
      await VerificationCode.deleteOne({ email });
      await User.deleteOne({ _id: user._id });
      await deleteImage(uploadedId).catch(() => {});
      throw error;
    }
    return res.status(201).json({ ok: true, message: "Usuario pendiente de verificacion; codigo enviado", email, userId: user._id });
  } catch (error) {
    if (uploadedId) await deleteImage(uploadedId).catch(() => {});
    return next(error);
  }
};

export const verifyRegistrationCode = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const code = String(req.body.verificationCodeRequest || "");
    if (!email || !code) return res.status(400).json({ ok: false, message: "email y verificationCodeRequest son obligatorios" });
    const verification = await VerificationCode.findOne({ email });
    if (!verification || verification.expiresAt <= new Date()) {
      return res.status(400).json({ ok: false, message: "El codigo vencio o no existe. Solicita otro." });
    }
    if (verification.attempts >= 5) return res.status(429).json({ ok: false, message: "Demasiados intentos. Solicita otro codigo." });
    if (!(await bcrypt.compare(code, verification.codeHash))) {
      verification.attempts += 1;
      await verification.save();
      return res.status(400).json({ ok: false, message: "Codigo incorrecto" });
    }
    const user = await User.findOne({ email }).select("+codigoVerificacion +codigoExpira");
    if (!user || user.codigoExpira <= new Date()) return res.status(400).json({ ok: false, message: "El codigo vencio o no existe" });
    user.isVerified = true;
    user.codigoVerificacion = undefined;
    user.codigoExpira = undefined;
    await user.save();
    await VerificationCode.deleteOne({ email });
    return res.json({ ok: true, message: "Correo verificado; usuario activado", user: publicUser(user) });
  } catch (error) { return next(error); }
};

export const publicUser = (user) => ({
  _id: user._id, name: user.name, apellido: user.apellido,
  email: user.email, telefono: user.telefono,
  fechaNacimiento: user.fechaNacimiento,
  fotoPerfil: user.fotoPerfil, cloudinaryPublicId: user.cloudinaryPublicId,
  isVerified: user.isVerified,
  createdAt: user.createdAt, updatedAt: user.updatedAt,
});
