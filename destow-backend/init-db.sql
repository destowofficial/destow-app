-- This script runs automatically when the Docker container starts for the first time.

CREATE TABLE agencies (
    id SERIAL PRIMARY KEY,
    agency_name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL
);

CREATE TABLE cabs (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER REFERENCES agencies(id),
    vehicle_type VARCHAR(100) NOT NULL,
    description TEXT,
    driver_included BOOLEAN DEFAULT true,
    price_per_km DECIMAL NOT NULL
);

-- Insert mock data
INSERT INTO agencies (agency_name, city) VALUES 
('Kutra Travels', 'Delhi'),
('Kummi Travels', 'Chandigarh');

INSERT INTO cabs (agency_id, vehicle_type, description, driver_included, price_per_km) VALUES 
(1, 'Sedan', '4 Seater A/C Cab', true, 13.00),
(2, 'SUV', '7 Seater A/C Cab', true, 20.00);
