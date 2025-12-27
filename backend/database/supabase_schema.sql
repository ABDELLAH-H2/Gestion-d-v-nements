-- Gestion d'Événements Database Schema (PostgreSQL)

-- Enable UUID extension if needed (though we use INTs, UUIDs are often preferred in Postgres)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('conference', 'concert', 'workshop', 'meetup')),
    description TEXT,
    date DATE NOT NULL,
    end_date DATE DEFAULT NULL,
    location VARCHAR(200) NOT NULL,
    capacity INT DEFAULT 100,
    price DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    image TEXT DEFAULT NULL,
    creator_id INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_status ON events(status);
CREATE INDEX idx_type ON events(type);
CREATE INDEX idx_date ON events(date);
CREATE INDEX idx_creator ON events(creator_id);

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE (user_id, event_id)
);

-- Scraped venues table
CREATE TABLE IF NOT EXISTS scraped_venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(300),
    phone VARCHAR(50),
    rating DECIMAL(2, 1),
    website VARCHAR(300),
    city VARCHAR(100),
    keyword VARCHAR(100),
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_city ON scraped_venues(city);
CREATE INDEX idx_keyword ON scraped_venues(keyword);

-- Insert sample data
INSERT INTO users (username, email, password) VALUES 
('demo', 'demo@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

INSERT INTO events (name, type, description, date, end_date, location, capacity, price, status, creator_id) VALUES
('Global Tech Summit 2024', 'conference', 'The world''s leading authority in debuting revolutionary startups and introducing game-changing technologies.', '2024-10-12', '2024-10-14', 'San Francisco, CA', 5000, 299.00, 'upcoming', 1),
('React Universe Conf', 'conference', 'Gathering thousands of Front-end and Full-stack engineers to discuss the future of React.', '2024-11-05', NULL, 'Austin, TX', 2000, 150.00, 'upcoming', 1),
('Design Systems Workshop', 'workshop', 'Learn to build scalable design systems from industry experts.', '2024-09-20', NULL, 'New York, NY', 50, 399.00, 'upcoming', 1),
('AI Future Conference', 'conference', 'Explore the cutting edge of artificial intelligence and machine learning.', '2024-12-10', '2024-12-12', 'Seattle, WA', 3000, 599.00, 'upcoming', 1),
('Cloud Native Meetup', 'meetup', 'Monthly meetup for cloud native enthusiasts and practitioners.', '2024-10-22', NULL, 'Chicago, IL', 100, 0.00, 'upcoming', 1),
('Startup Weekend', 'workshop', 'Build a startup in 54 hours with mentors and investors.', '2024-11-15', '2024-11-17', 'Boston, MA', 150, 50.00, 'upcoming', 1);
