import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.USER_EMAIL, pass: process.env.USER_PASSWORD },
});

export const sendVerificationEmail = async (email, code) => {
  if (!process.env.USER_EMAIL || !process.env.USER_PASSWORD) {
    throw new Error("Configura USER_EMAIL y USER_PASSWORD en .env");
  }

  return transporter.sendMail({
    from: process.env.USER_EMAIL,
    to: email,
    subject: "Verifica tu cuenta",
    text: `Tu codigo de verificacion es ${code}. Vence en 15 minutos.`,
    html: `<p>Tu codigo de verificacion es:</p><h2>${code}</h2><p>Vence en 15 minutos.</p>`,
  });
};
