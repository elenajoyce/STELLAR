-- Seed data for development database

-- Insert standard AI agents
INSERT INTO agents (id, name, status, capabilities, description) VALUES
('agent_procurement_1', 'Astraea Procurement Agent', 'active', ARRAY['retail_shopping', 'deals_finding', 'order_management'], 'Finds the best deals on physical electronics, hardware, and developer gear.'),
('agent_travel_2', 'Lumen Travel Agent', 'active', ARRAY['flight_booking', 'hotel_reservations', 'itinerary_planning'], 'Arranges dynamic business travel itineraries, flights, and accommodations.'),
('agent_digital_3', 'Soroban Smart Buyer', 'active', ARRAY['saas_subscriptions', 'api_credits', 'digital_services'], 'Manages ongoing digital software subscriptions, API credit top-ups, and cloud hosting.')
ON CONFLICT (id) DO NOTHING;
