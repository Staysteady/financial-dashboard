-- Seed data for Financial Dashboard
-- Default system categories that all users can access

-- Insert default expense categories
INSERT INTO categories (name, type, color, icon, is_system, user_id) VALUES
-- Main expense categories
('Food & Dining', 'expense', '#EF4444', 'utensils', true, NULL),
('Transportation', 'expense', '#3B82F6', 'car', true, NULL),
('Shopping', 'expense', '#8B5CF6', 'shopping-bag', true, NULL),
('Entertainment', 'expense', '#F59E0B', 'film', true, NULL),
('Bills & Utilities', 'expense', '#10B981', 'receipt-tax', true, NULL),
('Healthcare', 'expense', '#EC4899', 'heart', true, NULL),
('Education', 'expense', '#6366F1', 'academic-cap', true, NULL),
('Travel', 'expense', '#06B6D4', 'airplane', true, NULL),
('Home & Garden', 'expense', '#84CC16', 'home', true, NULL),
('Personal Care', 'expense', '#F97316', 'sparkles', true, NULL),
('Insurance', 'expense', '#64748B', 'shield-check', true, NULL),
('Taxes', 'expense', '#DC2626', 'document-text', true, NULL),
('Gifts & Donations', 'expense', '#DB2777', 'gift', true, NULL),
('Business Expenses', 'expense', '#7C3AED', 'briefcase', true, NULL),
('Miscellaneous', 'expense', '#6B7280', 'ellipsis-horizontal', true, NULL);

-- Insert subcategories for Food & Dining
INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Groceries', 'expense', '#EF4444', 'shopping-cart', id, true, NULL 
FROM categories WHERE name = 'Food & Dining' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Restaurants', 'expense', '#EF4444', 'building-storefront', id, true, NULL 
FROM categories WHERE name = 'Food & Dining' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Coffee & Tea', 'expense', '#EF4444', 'cup-hot', id, true, NULL 
FROM categories WHERE name = 'Food & Dining' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Fast Food', 'expense', '#EF4444', 'truck', id, true, NULL 
FROM categories WHERE name = 'Food & Dining' AND is_system = true;

-- Insert subcategories for Transportation
INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Fuel', 'expense', '#3B82F6', 'fire', id, true, NULL 
FROM categories WHERE name = 'Transportation' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Public Transport', 'expense', '#3B82F6', 'bus', id, true, NULL 
FROM categories WHERE name = 'Transportation' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Taxi & Rideshare', 'expense', '#3B82F6', 'car', id, true, NULL 
FROM categories WHERE name = 'Transportation' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Car Maintenance', 'expense', '#3B82F6', 'wrench-screwdriver', id, true, NULL 
FROM categories WHERE name = 'Transportation' AND is_system = true;

-- Insert subcategories for Bills & Utilities
INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Electricity', 'expense', '#10B981', 'bolt', id, true, NULL 
FROM categories WHERE name = 'Bills & Utilities' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Gas', 'expense', '#10B981', 'fire', id, true, NULL 
FROM categories WHERE name = 'Bills & Utilities' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Water', 'expense', '#10B981', 'beaker', id, true, NULL 
FROM categories WHERE name = 'Bills & Utilities' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Internet', 'expense', '#10B981', 'wifi', id, true, NULL 
FROM categories WHERE name = 'Bills & Utilities' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Phone', 'expense', '#10B981', 'phone', id, true, NULL 
FROM categories WHERE name = 'Bills & Utilities' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Council Tax', 'expense', '#10B981', 'building-office-2', id, true, NULL 
FROM categories WHERE name = 'Bills & Utilities' AND is_system = true;

-- Insert default income categories
INSERT INTO categories (name, type, color, icon, is_system, user_id) VALUES
('Salary', 'income', '#10B981', 'banknotes', true, NULL),
('Freelance', 'income', '#059669', 'computer-desktop', true, NULL),
('Business Income', 'income', '#047857', 'briefcase', true, NULL),
('Investment Returns', 'income', '#065F46', 'chart-bar-square', true, NULL),
('Rental Income', 'income', '#064E3B', 'home-modern', true, NULL),
('Interest', 'income', '#022C22', 'currency-pound', true, NULL),
('Dividends', 'income', '#14532D', 'trending-up', true, NULL),
('Bonus', 'income', '#166534', 'gift', true, NULL),
('Refunds', 'income', '#15803D', 'arrow-uturn-left', true, NULL),
('Other Income', 'income', '#16A34A', 'plus-circle', true, NULL);

-- Insert subcategories for Investment Returns
INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Stocks', 'income', '#065F46', 'chart-line', id, true, NULL 
FROM categories WHERE name = 'Investment Returns' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Bonds', 'income', '#065F46', 'document-chart-bar', id, true, NULL 
FROM categories WHERE name = 'Investment Returns' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Mutual Funds', 'income', '#065F46', 'building-library', id, true, NULL 
FROM categories WHERE name = 'Investment Returns' AND is_system = true;

INSERT INTO categories (name, type, color, icon, parent_category_id, is_system, user_id) 
SELECT 'Cryptocurrency', 'income', '#065F46', 'currency-bitcoin', id, true, NULL 
FROM categories WHERE name = 'Investment Returns' AND is_system = true;
