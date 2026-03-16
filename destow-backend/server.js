const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// PHASE 1: Mock Backend Data

// 1. Authentication Service
app.post('/auth/send-otp', (req, res) => {
  const { phone, name } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  // Simulate sending OTP
  console.log(`Sending OTP to ${phone} for user ${name || 'Unknown'}`);
  res.json({ message: 'OTP sent successfully', success: true });
});

app.post('/auth/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (otp === '123456') { // Mock OTP validation
    res.json({ success: true, token: 'mock-jwt-token-xyz' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid OTP' });
  }
});

// 2. Cab Search Service
app.get('/cabs', (req, res) => {
  const { from, to, date, time } = req.query;
  // Return mocked list of agencies and cabs
  res.json({
    success: true,
    data: [
      {
        id: 1,
        agency_name: 'Kutra Travels',
        vehicle_type: 'Sedan',
        description: '4 Seater A/C Cab',
        driver_included: true,
        price_per_km: 13,
      },
      {
        id: 2,
        agency_name: 'Kummi Travels',
        vehicle_type: 'SUV',
        description: '7 Seater A/C Cab',
        driver_included: true,
        price_per_km: 20,
      }
    ]
  });
});

// 3. Agency Service
app.get('/agencies', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, agency_name: 'Kutra Travels', city: 'Delhi' },
      { id: 2, agency_name: 'Kummi Travels', city: 'Chandigarh' }
    ]
  });
});

// 4. Booking Service
app.post('/booking', (req, res) => {
  const { user_id, agency_id, pickup_date, pickup_time } = req.body;
  res.json({
    success: true,
    booking_id: `BKG-${Math.floor(Math.random() * 10000)}`,
    status: 'Confirmed'
  });
});

app.get('/user/bookings', (req, res) => {
  res.json({
    success: true,
    data: [] // mock empty trips for now
  });
});

app.listen(PORT, () => {
  console.log(`Destow Backend listening on port ${PORT}`);
});
