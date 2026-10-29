package com.raaz.metroroutefinder;

import android.content.Context;
import android.content.SharedPreferences;

public class AlarmStateRepository {

    public static final String PREFS_NAME = "alarm_widget_prefs";
    public static final String ACTION_DISMISS_ALARM = "com.raaz.metroroutefinder.ACTION_DISMISS_ALARM";
    public static final String ACTION_SNOOZE_ALARM = "com.raaz.metroroutefinder.ACTION_SNOOZE_ALARM";

    public static class AlarmModel {
        public final String stationName;
        public final String status;
        public final String distance;
        public final boolean isRinging;
        public final boolean isActive;
        public final boolean hasRoute;
        public final String startStation;
        public final String endStation;
        public final String timeText;
        public final String distanceText;
        public final String fareText;
        public final boolean persistentNotifEnabled;
        public final String notifStyle;
        public final String themeId;
        public final String themeAccent;
        public final String themeBg;
        public final String themeSurface;
        public final String themeText;

        public AlarmModel(String stationName, String status, String distance, boolean isRinging, boolean isActive,
                          boolean hasRoute, String startStation, String endStation,
                          String timeText, String distanceText, String fareText,
                          boolean persistentNotifEnabled, String notifStyle,
                          String themeId, String themeAccent, String themeBg, String themeSurface, String themeText) {
            this.stationName = stationName != null ? stationName : "No Alarm Set";
            this.status = status != null ? status : "STANDBY";
            this.distance = distance != null ? distance : "---";
            this.isRinging = isRinging;
            this.isActive = isActive;
            this.hasRoute = hasRoute;
            this.startStation = startStation != null ? startStation : "";
            this.endStation = endStation != null ? endStation : "";
            this.timeText = timeText != null ? timeText : "-- min";
            this.distanceText = distanceText != null ? distanceText : "-- km";
            this.fareText = fareText != null ? fareText : "₹--";
            this.persistentNotifEnabled = persistentNotifEnabled;
            this.notifStyle = notifStyle != null ? notifStyle : "boarding_pass";
            this.themeId = themeId != null ? themeId : "classic";
            this.themeAccent = themeAccent != null ? themeAccent : "#2563eb";
            this.themeBg = themeBg != null ? themeBg : "#1e293b";
            this.themeSurface = themeSurface != null ? themeSurface : "#0f172a";
            this.themeText = themeText != null ? themeText : "#f8fafc";
        }
    }

    public static void saveFullState(Context context, String stationName, String status, String distance,
                                      boolean isRinging, boolean isActive, boolean hasRoute,
                                      String startStation, String endStation,
                                      String timeText, String distanceText, String fareText) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        if (stationName != null) editor.putString("stationName", stationName);
        if (status != null) editor.putString("status", status);
        if (distance != null) editor.putString("distance", distance);
        editor.putBoolean("isRinging", isRinging);
        editor.putBoolean("isActive", isActive);
        editor.putBoolean("hasRoute", hasRoute);
        if (startStation != null) editor.putString("startStation", startStation);
        if (endStation != null) editor.putString("endStation", endStation);
        if (timeText != null) editor.putString("timeText", timeText);
        if (distanceText != null) editor.putString("distanceText", distanceText);
        if (fareText != null) editor.putString("fareText", fareText);
        editor.apply();
    }

    public static void saveAlarmState(Context context, String stationName, String status, String distance,
                                      boolean isRinging, boolean isActive) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        if (stationName != null) editor.putString("stationName", stationName);
        if (status != null) editor.putString("status", status);
        if (distance != null) editor.putString("distance", distance);
        editor.putBoolean("isRinging", isRinging);
        editor.putBoolean("isActive", isActive);
        editor.apply();
    }

    public static void saveRouteState(Context context, boolean hasRoute, String startStation, String endStation,
                                      String timeText, String distanceText, String fareText) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        editor.putBoolean("hasRoute", hasRoute);
        editor.putString("startStation", startStation != null ? startStation : "");
        editor.putString("endStation", endStation != null ? endStation : "");
        editor.putString("timeText", timeText != null ? timeText : "-- min");
        editor.putString("distanceText", distanceText != null ? distanceText : "-- km");
        editor.putString("fareText", fareText != null ? fareText : "₹--");
        editor.apply();
    }

    public static void savePersistentSetting(Context context, boolean enabled) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        editor.putBoolean("persistentNotifEnabled", enabled);
        editor.apply();
    }

    public static void saveNotifStyle(Context context, String style) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        editor.putString("notifStyle", style != null ? style : "boarding_pass");
        editor.apply();
    }

    public static void saveThemeState(Context context, String themeId, String accent, String bg, String surface, String text) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        if (themeId != null) editor.putString("themeId", themeId);
        if (accent != null) editor.putString("themeAccent", accent);
        if (bg != null) editor.putString("themeBg", bg);
        if (surface != null) editor.putString("themeSurface", surface);
        if (text != null) editor.putString("themeText", text);
        editor.apply();
    }

    public static AlarmModel getState(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return new AlarmModel(
                prefs.getString("stationName", "No Alarm Set"),
                prefs.getString("status", "STANDBY"),
                prefs.getString("distance", "---"),
                prefs.getBoolean("isRinging", false),
                prefs.getBoolean("isActive", false),
                prefs.getBoolean("hasRoute", false),
                prefs.getString("startStation", ""),
                prefs.getString("endStation", ""),
                prefs.getString("timeText", "-- min"),
                prefs.getString("distanceText", "-- km"),
                prefs.getString("fareText", "₹--"),
                prefs.getBoolean("persistentNotifEnabled", true),
                prefs.getString("notifStyle", "boarding_pass"),
                prefs.getString("themeId", "classic"),
                prefs.getString("themeAccent", "#2563eb"),
                prefs.getString("themeBg", "#1e293b"),
                prefs.getString("themeSurface", "#0f172a"),
                prefs.getString("themeText", "#f8fafc")
        );
    }
}
