import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { transporter } from './src/config/email.js';

const PORT = process.env.PORT || 5000;

console.log('Starting server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI set:', !!process.env.MONGODB_URI);
console.log('JWT_ACCESS_SECRET set:', !!process.env.JWT_ACCESS_SECRET);
console.log('SMTP_USER:', process.env.SMTP_USER || '(not set)');
console.log('SMTP_PASS set:', !!process.env.SMTP_PASS);

transporter.verify((err) => {
  if (err) {
    console.error('SMTP connection FAILED:', err.message);
  } else {
    console.log('SMTP connection OK - emails ready to send');
  }
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });
