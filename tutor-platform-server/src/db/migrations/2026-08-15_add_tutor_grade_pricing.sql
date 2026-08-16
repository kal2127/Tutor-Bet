ALTER TABLE tutor_application_details
  ADD COLUMN hourly_rates_by_grade JSON NULL AFTER grade_levels;
