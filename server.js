const express = require('express');
const path = require('path');

require('dotenv').config();
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

/** Health check */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/** Contact form -> Gmail SMTP (App Password required) */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Please fill in all fields.' });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = String(process.env.SMTP_SECURE || 'true') === 'true';

    if (!host || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.TO_EMAIL) {
      return res.status(500).json({
        error: 'Server email is not configured. Add SMTP_* and TO_EMAIL to .env.'
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const safe = (s) => String(s).replace(/[<>]/g, '');

    await transporter.sendMail({
      from: `ChooseYourGameMode <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL,
      replyTo: safe(email),
      subject: `[ChooseYourGameMode] ${safe(subject)}`,
      text:
`New message from ChooseYourGameMode

Name: ${safe(name)}
Email: ${safe(email)}
Subject: ${safe(subject)}

Message:
${safe(message)}
`
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Contact error:', err);
    return res.status(500).json({ error: 'Email failed to send. Check SMTP settings.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎮 ChooseYourGameMode is live!`);
  console.log(`🌐 Open: http://localhost:${PORT}\n`);
});
