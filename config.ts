const config = {
  database: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "node_mysql_api",
  },
  secret: process.env.JWT_SECRET || "THIS_IS_A_SECRET_KEY",
  emailFrom: process.env.EMAIL_FROM || "ronanreaper@gmail.com",
  smtpOptions: {
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER || "karlee.lind@ethereal.email",
      pass: process.env.SMTP_PASS || "XfW9P5rGqV8m6nJ2",
    },
  },
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || "https://angular-21-auth-boilerplate-aw3r.onrender.com",
  frontendUrl: process.env.FRONTEND_URL || "https://angular-21-auth-boilerplate-aw3r.onrender.com",
};

export default config;

