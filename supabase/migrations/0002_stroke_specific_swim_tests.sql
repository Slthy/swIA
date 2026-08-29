alter table public.athlete_logs
  add column time_25y_breaststroke_seconds numeric(7,3),
  add column time_25y_freestyle_seconds numeric(7,3),
  add column time_25y_fly_seconds numeric(7,3),
  add column time_25y_backstroke_seconds numeric(7,3),
  add column pace_3x100_breaststroke_seconds numeric(7,3),
  add column pace_3x100_freestyle_seconds numeric(7,3),
  add column pace_3x100_fly_seconds numeric(7,3),
  add column pace_3x100_backstroke_seconds numeric(7,3),
  add column pace_3x100_im_seconds numeric(7,3);

alter table public.athlete_logs
  add constraint time_25y_breaststroke_seconds_range check (time_25y_breaststroke_seconds > 0 and time_25y_breaststroke_seconds <= 300),
  add constraint time_25y_freestyle_seconds_range check (time_25y_freestyle_seconds > 0 and time_25y_freestyle_seconds <= 300),
  add constraint time_25y_fly_seconds_range check (time_25y_fly_seconds > 0 and time_25y_fly_seconds <= 300),
  add constraint time_25y_backstroke_seconds_range check (time_25y_backstroke_seconds > 0 and time_25y_backstroke_seconds <= 300),
  add constraint pace_3x100_breaststroke_seconds_range check (pace_3x100_breaststroke_seconds > 0 and pace_3x100_breaststroke_seconds <= 600),
  add constraint pace_3x100_freestyle_seconds_range check (pace_3x100_freestyle_seconds > 0 and pace_3x100_freestyle_seconds <= 600),
  add constraint pace_3x100_fly_seconds_range check (pace_3x100_fly_seconds > 0 and pace_3x100_fly_seconds <= 600),
  add constraint pace_3x100_backstroke_seconds_range check (pace_3x100_backstroke_seconds > 0 and pace_3x100_backstroke_seconds <= 600),
  add constraint pace_3x100_im_seconds_range check (pace_3x100_im_seconds > 0 and pace_3x100_im_seconds <= 600);

comment on column public.athlete_logs.time_25y_seconds is 'Legacy unspecified-stroke 25y time. New entries use stroke-specific columns.';
comment on column public.athlete_logs.pace_3x100_seconds is 'Legacy unspecified-stroke 3x100 average pace. New entries use stroke-specific columns.';
