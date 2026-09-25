-- Seed initial data for GramFinance
-- Initial verified scheme
INSERT INTO public.schemes (name_en, name_kn, description_en, description_kn, target_groups, required_documents, official_url, last_verified)
VALUES (
    'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ (PM-KISAN)',
    'Financial support of Rs. 6,000 per year for all landholding farmer families.',
    'ಎಲ್ಲಾ ಭೂಮಿ ಹೊಂದಿರುವ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ವರ್ಷಕ್ಕೆ ರೂ. 6,000 ಹಣಕಾಸಿನ ನೆರವು.',
    ARRAY['farmer', 'small_holder'],
    ARRAY['Aadhaar Card', 'Land Records', 'Bank Account Details'],
    'https://pmkisan.gov.in/',
    '2026-01-15'
) ON CONFLICT DO NOTHING;
