-- Each child keeps the world they picked (space, princess, robot, unicorn) across devices.
-- Only the look changes with the theme; stars and mastery are shared by every theme.
-- Until this runs the app still syncs everything else and keeps the theme on the device.
alter table public.children add column if not exists theme text
  check (theme is null or theme ~ '^[a-z]{1,20}$');
