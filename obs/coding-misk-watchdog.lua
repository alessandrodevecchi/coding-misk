-- coding-misk watchdog for OBS (#52).
-- The control room writes a beat into the input "cm-heartbeat" every second while the broadcast window draws.
-- While OBS sends its output, if the beat stops for a few seconds this script switches from the Live scene to
-- the Standby scene, and back to Live when the beat returns (only when it was this script that switched).
-- Load it in OBS: Tools, Scripts, +, pick this file.

obs = obslua

local BEAT = "cm-heartbeat"
local live_name, standby_name, seconds = "Live", "Standby", 5
local last_beat, last_change, switched = nil, 0, false
local beat_src = nil

local function now_s() return obs.os_gettime_ns() / 1e9 end

function script_description()
  return "<b>coding-misk watchdog</b><br>Switches to the Standby scene when the coding-misk picture stops, and back to Live when it returns. Acts only while OBS sends its output."
end

function script_properties()
  local p = obs.obs_properties_create()
  obs.obs_properties_add_text(p, "live", "Live scene", obs.OBS_TEXT_DEFAULT)
  obs.obs_properties_add_text(p, "standby", "Standby scene", obs.OBS_TEXT_DEFAULT)
  obs.obs_properties_add_int(p, "seconds", "Seconds without the picture", 2, 30, 1)
  return p
end

function script_defaults(s)
  obs.obs_data_set_default_string(s, "live", "Live")
  obs.obs_data_set_default_string(s, "standby", "Standby")
  obs.obs_data_set_default_int(s, "seconds", 5)
end

function script_update(s)
  live_name = obs.obs_data_get_string(s, "live")
  standby_name = obs.obs_data_get_string(s, "standby")
  seconds = obs.obs_data_get_int(s, "seconds")
end

-- the beat input: an invisible colour source outside every scene, made here when it is missing
local function ensure_beat()
  local src = obs.obs_get_source_by_name(BEAT)
  if src ~= nil then obs.obs_source_release(src) return end
  local st = obs.obs_data_create()
  beat_src = obs.obs_source_create("color_source_v3", BEAT, st, nil)
  if beat_src == nil then beat_src = obs.obs_source_create("color_source", BEAT, st, nil) end
  obs.obs_data_release(st)
end

local function read_beat()
  local src = obs.obs_get_source_by_name(BEAT)
  if src == nil then return nil end
  local st = obs.obs_source_get_settings(src)
  local b = obs.obs_data_get_int(st, "beat")
  obs.obs_data_release(st)
  obs.obs_source_release(src)
  return b
end

local function current_scene()
  local cur = obs.obs_frontend_get_current_scene()
  if cur == nil then return "" end
  local name = obs.obs_source_get_name(cur)
  obs.obs_source_release(cur)
  return name
end

local function switch_to(name)
  local s = obs.obs_get_source_by_name(name)
  if s ~= nil then
    obs.obs_frontend_set_current_scene(s)
    obs.obs_source_release(s)
  end
end

local function tick()
  local b = read_beat()
  local t = now_s()
  if b ~= last_beat then last_beat = b; last_change = t end
  local fresh = (t - last_change) < seconds
  if not obs.obs_frontend_streaming_active() then switched = false return end
  local name = current_scene()
  if not fresh and name == live_name then
    switch_to(standby_name); switched = true
  elseif fresh and switched and name == standby_name then
    switch_to(live_name); switched = false
  end
end

function script_load(s)
  ensure_beat()
  last_beat = read_beat(); last_change = now_s()
  obs.timer_add(tick, 1000)
end

function script_unload()
  obs.timer_remove(tick)
  if beat_src ~= nil then obs.obs_source_release(beat_src); beat_src = nil end
end
