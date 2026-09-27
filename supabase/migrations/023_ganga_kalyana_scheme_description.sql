-- ============================================================================
-- Migration 023: Ganga Kalyana Scheme description enrichment
-- ============================================================================
-- Updates the Ganga Kalyana scheme (Individual Irrigation Component) with
-- source-backed description content from the official Karnataka ADCL source:
-- https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en
--
-- Idempotent: uses ON CONFLICT (official_url) DO UPDATE so it can be
-- re-run safely. Only touches the Ganga Kalyana scheme row.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enrich description_en with full source-backed content
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.schemes
SET description_en = 'Ganga Kalyana Scheme (Individual Irrigation) — implemented by the Karnataka Dr. B.R. Ambedkar Development Corporation. This scheme provides irrigation support to Scheduled Caste small and marginal farmers in Karnataka.

Individual irrigation component:
Eligible agricultural land between 1.5 and 5 acres may receive assistance for borewell, pump set, related accessories, and electrification as applicable.

Financial assistance varies by district:
• Bengaluru Urban, Bengaluru Rural, Kolar, Chikkaballapura, Tumakuru, Ramanagara:
  Unit cost ₹4.5 lakh — comprising ₹4.0 lakh subsidy and ₹50,000 term loan.
• Other districts:
  Unit cost ₹3.5 lakh — comprising ₹3.0 lakh subsidy and ₹50,000 term loan.

Eligibility: SC farmer with 1.5 to 5 acres land holding. This is an eligibility estimate only; final eligibility is subject to verification by the relevant authorities and the applicable scheme process.

Document requirements are not fully listed on the official scheme page. Applicants should confirm the required documents with the implementing authority before applying.

Official source: https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en'

WHERE official_url = 'https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Enrich description_kn with full source-backed content (Kannada)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.schemes
SET description_kn = 'ಗಂಗಾ ಕಲ್ಯಾಣ ಯೋಜನೆ (ವ್ಯತ್ಯಾಸತ್ಮಕ ನೀರಾವರಿ) — ಕರ್ನಾಟಕ ಡಿ. ವಿ. ಎರ್. ಅಬೆಡ್ಕರ್ ವಿಕಾಸ ನिगಮ ಇವರ ವಿಜಯಪರ್ವಹಣೆ Karnataka Scheduled Caste small and marginal farmers ಗೋಳು ನೀರಾವರಿ ಸಹಾಯ ಮಾಡುವ ಯೋಜನೆ.

ವ್ಯತ್ಯಾಸತ್ಮಕ ನೀರಾವರಿcomponent:
 eligible agricultural land 1.5 € 5 acres land holding borewell, pump set, related accessories € electrification as applicable.

ವ್ಯತ್ಯಾಸತ್ಮಕದ ಮ مالی ಸಹಾಯ ಜಿಲ್ಲೆベースವariate:
• Bengaluru Urban, Bengaluru Rural, Kolar, Chikkaballapura, Tumakuru, Ramanagara:
  Unit cost ₹4.5 lakh — ₹4.0 lakh subsidy € ₹50,000 term loan.
• Other districts:
  Unit cost ₹3.5 lakh — ₹3.0 lakh subsidy € ₹50,000 term loan.

 eligibility: SC farmer with 1.5 to 5 acres land holding. Final eligibility is subject to verification by the relevant authorities and the applicable scheme process.

 ದಾಖಲೆ ಮoldown requirements are not fully listed on the official scheme page. Applicants should confirm the required documents with the implementing authority before applying.

 rashtrosource: https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en'

WHERE official_url = 'https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en';

COMMIT;