package com.raaz.metroroutefinder;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

public class AlarmNotificationManager {

    public static final String CHANNEL_SILENT_ID = "metro_journey_silent_v2";
    public static final String CHANNEL_SILENT_NAME = "Metro Live Journey Pass (Silent)";

    public static final String CHANNEL_ALARM_ID = "metro_alarm_urgent_v2";
    public static final String CHANNEL_ALARM_NAME = "Metro Station Arrival Alarm (Heads-Up)";

    public static final int NOTIFICATION_ID = 2507;

    public static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            // 1. Silent Channel for Journey Tracking & Persistent Pass
            NotificationChannel silentChannel = new NotificationChannel(
                    CHANNEL_SILENT_ID,
                    CHANNEL_SILENT_NAME,
                    NotificationManager.IMPORTANCE_LOW
            );
            silentChannel.setDescription("Silent background live metro journey pass");
            silentChannel.enableVibration(false);
            silentChannel.setSound(null, null);
            silentChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(silentChannel);

            // 2. Urgent Channel for Arrival Alarm (Pops up with Sound & Vibration!)
            NotificationChannel alarmChannel = new NotificationChannel(
                    CHANNEL_ALARM_ID,
                    CHANNEL_ALARM_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            alarmChannel.setDescription("Urgent heads-up arrival alarm with sound and vibration");
            alarmChannel.enableVibration(true);
            alarmChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
            Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmSound == null) {
                alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build();
            alarmChannel.setSound(alarmSound, audioAttributes);
            alarmChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(alarmChannel);
        }
    }

    public static void updateNotification(Context context, AlarmStateRepository.AlarmModel model) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        // If no route, no alarm, and user disabled persistent notification -> Cancel
        if (!model.hasRoute && !model.isActive && !model.isRinging && !model.persistentNotifEnabled) {
            manager.cancel(NOTIFICATION_ID);
            return;
        }

        createChannels(context);

        // Open App Intent
        Intent openAppIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (openAppIntent == null) {
            openAppIntent = new Intent(context, MainActivity.class);
        }
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Snooze & Dismiss Broadcast Intents
        Intent snoozeIntent = new Intent(context, AlarmActionReceiver.class);
        snoozeIntent.setAction(AlarmStateRepository.ACTION_SNOOZE_ALARM);
        PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
                context, 101, snoozeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent dismissIntent = new Intent(context, AlarmActionReceiver.class);
        dismissIntent.setAction(AlarmStateRepository.ACTION_DISMISS_ALARM);
        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
                context, 102, dismissIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Build Custom Views based on Selected Style
        RemoteViews compactViews;
        RemoteViews bigViews;
        String style = model.notifStyle != null ? model.notifStyle : "boarding_pass";

        if ("minimal_pill".equals(style)) {
            compactViews = buildMinimalViews(context, model, openAppPendingIntent, snoozePendingIntent, dismissPendingIntent);
            bigViews = compactViews;
        } else if ("progress_bar".equals(style)) {
            compactViews = buildCompactDefault(context, model, openAppPendingIntent, snoozePendingIntent, dismissPendingIntent);
            bigViews = buildProgressViews(context, model, openAppPendingIntent, snoozePendingIntent, dismissPendingIntent);
        } else if ("widget_mirror".equals(style)) {
            compactViews = buildWidgetMirrorViews(context, model, openAppPendingIntent, snoozePendingIntent, dismissPendingIntent);
            bigViews = compactViews;
        } else {
            // Default: "boarding_pass"
            compactViews = buildCompactDefault(context, model, openAppPendingIntent, snoozePendingIntent, dismissPendingIntent);
            bigViews = buildBoardingPassViews(context, model, openAppPendingIntent, snoozePendingIntent, dismissPendingIntent);
        }

        // Configuration
        String targetChannelId = model.isRinging ? CHANNEL_ALARM_ID : CHANNEL_SILENT_ID;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, targetChannelId)
                .setSmallIcon(R.drawable.ic_stat_metro)
                .setCustomContentView(compactViews)
                .setCustomBigContentView(bigViews)
                .setContentIntent(openAppPendingIntent)
                .setOngoing(model.hasRoute || model.isActive || model.isRinging || model.persistentNotifEnabled)
                .setAutoCancel(false);

        if (model.isRinging) {
            builder.setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
                    .setOnlyAlertOnce(false)
                    .setFullScreenIntent(openAppPendingIntent, true);
        } else {
            builder.setPriority(NotificationCompat.PRIORITY_LOW)
                    .setCategory(NotificationCompat.CATEGORY_STATUS)
                    .setSilent(true)
                    .setOnlyAlertOnce(true);
        }

        manager.notify(NOTIFICATION_ID, builder.build());
    }

    // =========================================================================
    // STYLE 1: BOARDING PASS (Expanded) + DEFAULT COMPACT (64dp)
    // =========================================================================
    private static RemoteViews buildCompactDefault(Context context, AlarmStateRepository.AlarmModel model,
                                                   PendingIntent openApp, PendingIntent snooze, PendingIntent dismiss) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_compact_layout);

        views.setInt(R.id.compact_root, "setBackgroundResource", AlarmWidgetProvider.getCardBackgroundForTheme(model.themeId));
        int accentColor = Color.parseColor(model.themeAccent != null ? model.themeAccent : "#2563eb");

        String title;
        if (model.hasRoute && !model.startStation.isEmpty() && !model.endStation.isEmpty()) {
            title = model.startStation + " ➔ " + model.endStation;
        } else if (model.isActive && !model.stationName.isEmpty()) {
            title = "Next: " + model.stationName;
        } else {
            title = "Metro Live Pass • Standby";
        }
        views.setTextViewText(R.id.compact_route_title, title);

        String dist = model.isActive ? ("📍 " + model.distance) : (model.hasRoute ? ("📏 " + model.distanceText) : "📍 Standby");
        views.setTextViewText(R.id.compact_live_distance, dist);

        bindActionButtons(views, R.id.compact_btn_snooze, R.id.compact_btn_dismiss, model.isActive, snooze, dismiss);
        views.setOnClickPendingIntent(R.id.compact_root, openApp);
        return views;
    }

    private static RemoteViews buildBoardingPassViews(Context context, AlarmStateRepository.AlarmModel model,
                                                     PendingIntent openApp, PendingIntent snooze, PendingIntent dismiss) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_alarm_layout);

        views.setInt(R.id.notification_root, "setBackgroundResource", AlarmWidgetProvider.getCardBackgroundForTheme(model.themeId));
        int accentColor = Color.parseColor(model.themeAccent != null ? model.themeAccent : "#2563eb");
        views.setTextColor(R.id.notif_app_title, accentColor);
        views.setTextColor(R.id.notif_arrow_symbol, accentColor);

        int routeVisibility = model.hasRoute ? View.VISIBLE : View.GONE;
        views.setViewVisibility(R.id.notif_route_stations_row, routeVisibility);
        views.setViewVisibility(R.id.notif_metrics_row, routeVisibility);

        if (model.hasRoute) {
            views.setTextViewText(R.id.notif_start_station, model.startStation.isEmpty() ? "Origin" : model.startStation);
            views.setTextViewText(R.id.notif_end_station, model.endStation.isEmpty() ? "Destination" : model.endStation);
            views.setTextViewText(R.id.notif_chip_time, "⏱️ " + model.timeText);
            views.setTextViewText(R.id.notif_chip_distance, "📏 " + model.distanceText);
            views.setTextViewText(R.id.notif_chip_fare, "💰 " + model.fareText);
        }

        views.setTextViewText(R.id.notif_station_name, model.stationName);
        views.setTextViewText(R.id.notif_live_distance, "📍 " + model.distance);

        if (model.isRinging) {
            views.setTextViewText(R.id.notif_screen_icon, "🚨");
            views.setTextViewText(R.id.notif_status_label, "RINGING");
            views.setTextColor(R.id.notif_status_label, Color.parseColor("#EF4444"));
            views.setTextColor(R.id.notif_station_name, Color.parseColor("#EF4444"));
        } else if (model.isActive) {
            views.setTextViewText(R.id.notif_screen_icon, "🔔");
            views.setTextViewText(R.id.notif_status_label, model.status.isEmpty() ? "TRACKING" : model.status);
            views.setTextColor(R.id.notif_status_label, Color.parseColor("#22C55E"));
            views.setTextColor(R.id.notif_station_name, Color.parseColor("#FACC15"));
        } else {
            views.setTextViewText(R.id.notif_screen_icon, "🔔");
            views.setTextViewText(R.id.notif_status_label, "STANDBY");
            views.setTextColor(R.id.notif_status_label, Color.parseColor("#9CA3AF"));
            views.setTextColor(R.id.notif_station_name, accentColor);
        }

        bindActionButtons(views, R.id.notif_btn_snooze, R.id.notif_btn_dismiss, model.isActive, snooze, dismiss);
        views.setOnClickPendingIntent(R.id.notification_root, openApp);
        return views;
    }

    // =========================================================================
    // STYLE 2: MINIMAL ISLAND PILL
    // =========================================================================
    private static RemoteViews buildMinimalViews(Context context, AlarmStateRepository.AlarmModel model,
                                                 PendingIntent openApp, PendingIntent snooze, PendingIntent dismiss) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_minimal_layout);

        views.setInt(R.id.notif_minimal_root, "setBackgroundResource", AlarmWidgetProvider.getCardBackgroundForTheme(model.themeId));
        int accentColor = Color.parseColor(model.themeAccent != null ? model.themeAccent : "#2563eb");
        views.setTextColor(R.id.notif_min_distance, accentColor);

        String mainTitle;
        if (model.isActive && !model.stationName.isEmpty()) {
            mainTitle = model.stationName;
        } else if (model.hasRoute && !model.endStation.isEmpty()) {
            mainTitle = model.startStation + " ➔ " + model.endStation;
        } else {
            mainTitle = "Metro Live Tracker";
        }
        views.setTextViewText(R.id.notif_min_station_title, mainTitle);

        String subtext;
        if (model.isRinging) {
            subtext = "🚨 ALARM RINGING • ARRIVING NOW";
        } else if (model.isActive) {
            subtext = "🔔 Active Alert • " + (model.status.isEmpty() ? "Approaching" : model.status);
        } else if (model.hasRoute) {
            subtext = "⏱️ " + model.timeText + " • " + model.fareText;
        } else {
            subtext = "Standby • Ready for journey";
        }
        views.setTextViewText(R.id.notif_min_subtext, subtext);

        String dist = model.isActive ? ("📍 " + model.distance) : (model.hasRoute ? ("📏 " + model.distanceText) : "📍 Standby");
        views.setTextViewText(R.id.notif_min_distance, dist);
        views.setTextViewText(R.id.notif_min_icon, model.isRinging ? "🚨" : (model.isActive ? "🔔" : "⚡"));

        bindActionButtons(views, R.id.notif_min_btn_snooze, R.id.notif_min_btn_dismiss, model.isActive, snooze, dismiss);
        views.setOnClickPendingIntent(R.id.notif_minimal_root, openApp);
        return views;
    }

    // =========================================================================
    // STYLE 3: VISUAL TRACK PROGRESS
    // =========================================================================
    private static RemoteViews buildProgressViews(Context context, AlarmStateRepository.AlarmModel model,
                                                  PendingIntent openApp, PendingIntent snooze, PendingIntent dismiss) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_progress_layout);

        views.setInt(R.id.notif_prog_root, "setBackgroundResource", AlarmWidgetProvider.getCardBackgroundForTheme(model.themeId));
        int accentColor = Color.parseColor(model.themeAccent != null ? model.themeAccent : "#2563eb");
        views.setTextColor(R.id.notif_prog_eta_badge, accentColor);
        views.setTextColor(R.id.notif_prog_distance, accentColor);
        views.setTextColor(R.id.notif_prog_arrow_symbol, accentColor);

        views.setTextViewText(R.id.notif_prog_header_title,
                model.isRinging ? "🚨 STATION ARRIVAL" : (model.isActive ? "📊 LIVE TRACKER" : "📊 METRO TRACK"));

        views.setTextViewText(R.id.notif_prog_eta_badge, "⏱️ " + model.timeText);

        if (model.hasRoute) {
            views.setTextViewText(R.id.notif_prog_start_station, model.startStation.isEmpty() ? "Origin" : model.startStation);
            views.setTextViewText(R.id.notif_prog_end_station, model.endStation.isEmpty() ? "Destination" : model.endStation);
        } else {
            views.setTextViewText(R.id.notif_prog_start_station, "Origin");
            views.setTextViewText(R.id.notif_prog_end_station, "Destination");
        }

        if (model.isRinging) {
            views.setTextViewText(R.id.notif_prog_track_visual, "🚨🚨 REACHED STATION NOW 🚨🚨");
        } else if (model.isActive) {
            views.setTextViewText(R.id.notif_prog_track_visual, "🟢━━━🟢━━━🚆━━━━━⚪━━━🏁");
        } else {
            views.setTextViewText(R.id.notif_prog_track_visual, "⚪━━━━⚪━━━━🚆━━━━⚪━━━━🏁");
        }

        String target = "Next Alert: " + (model.isActive ? model.stationName : (model.hasRoute ? model.endStation : "Standby"));
        views.setTextViewText(R.id.notif_prog_target_station, target);

        String dist = model.isActive ? ("📍 " + model.distance) : (model.hasRoute ? ("📏 " + model.distanceText) : "📍 Standby");
        views.setTextViewText(R.id.notif_prog_distance, dist);

        bindActionButtons(views, R.id.notif_prog_btn_snooze, R.id.notif_prog_btn_dismiss, model.isActive, snooze, dismiss);
        views.setOnClickPendingIntent(R.id.notif_prog_root, openApp);
        return views;
    }

    // =========================================================================
    // STYLE 4: 2.5D WIDGET MIRROR
    // =========================================================================
    private static RemoteViews buildWidgetMirrorViews(Context context, AlarmStateRepository.AlarmModel model,
                                                     PendingIntent openApp, PendingIntent snooze, PendingIntent dismiss) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_widget_mirror_layout);

        views.setInt(R.id.notif_widget_mirror_root, "setBackgroundResource", AlarmWidgetProvider.getCardBackgroundForTheme(model.themeId));
        int accentColor = Color.parseColor(model.themeAccent != null ? model.themeAccent : "#2563eb");

        if (model.isRinging) {
            views.setTextViewText(R.id.notif_wm_status_label, "RINGING");
            views.setTextColor(R.id.notif_wm_status_label, Color.parseColor("#EF4444"));
            views.setTextViewText(R.id.notif_wm_pod_icon, "🚨");
            views.setInt(R.id.notif_wm_pod_icon, "setBackgroundResource", R.drawable.widget_pod_circle);
            views.setTextViewText(R.id.notif_wm_screen_icon, "🚨");
            views.setTextViewText(R.id.notif_wm_station_name, model.stationName);
            views.setTextColor(R.id.notif_wm_station_name, Color.parseColor("#EF4444"));
        } else if (model.isActive) {
            views.setTextViewText(R.id.notif_wm_status_label, model.status.isEmpty() ? "TRACKING" : model.status);
            views.setTextColor(R.id.notif_wm_status_label, Color.parseColor("#22C55E"));
            views.setTextViewText(R.id.notif_wm_pod_icon, "🔔");
            views.setInt(R.id.notif_wm_pod_icon, "setBackgroundResource", R.drawable.widget_pod_circle);
            views.setTextViewText(R.id.notif_wm_screen_icon, "🔔");
            views.setTextViewText(R.id.notif_wm_station_name, model.stationName);
            views.setTextColor(R.id.notif_wm_station_name, Color.parseColor("#38BDF8"));
        } else {
            views.setTextViewText(R.id.notif_wm_status_label, "STANDBY");
            views.setTextColor(R.id.notif_wm_status_label, Color.parseColor("#9CA3AF"));
            views.setTextViewText(R.id.notif_wm_pod_icon, "🔔");
            views.setInt(R.id.notif_wm_pod_icon, "setBackgroundResource", R.drawable.widget_pod_inactive);
            views.setTextViewText(R.id.notif_wm_screen_icon, "🔔");
            views.setTextViewText(R.id.notif_wm_station_name, model.hasRoute ? (model.startStation + " ➔ " + model.endStation) : "No Alarm Set");
            views.setTextColor(R.id.notif_wm_station_name, accentColor);
        }

        String dist = model.isActive ? ("📍 " + model.distance) : (model.hasRoute ? ("📏 " + model.distanceText) : "📍 ---");
        views.setTextViewText(R.id.notif_wm_distance_badge, dist);

        bindActionButtons(views, R.id.notif_wm_btn_snooze, R.id.notif_wm_btn_dismiss, model.isActive, snooze, dismiss);
        views.setOnClickPendingIntent(R.id.notif_widget_mirror_root, openApp);
        return views;
    }

    private static void bindActionButtons(RemoteViews views, int snoozeId, int dismissId, boolean isActive,
                                          PendingIntent snooze, PendingIntent dismiss) {
        if (isActive) {
            views.setInt(snoozeId, "setBackgroundResource", R.drawable.widget_btn_snooze);
            views.setTextColor(snoozeId, Color.parseColor("#FBBF24"));
            views.setOnClickPendingIntent(snoozeId, snooze);

            views.setInt(dismissId, "setBackgroundResource", R.drawable.widget_btn_dismiss);
            views.setTextColor(dismissId, Color.parseColor("#F87171"));
            views.setOnClickPendingIntent(dismissId, dismiss);
        } else {
            views.setInt(snoozeId, "setBackgroundResource", R.drawable.widget_btn_disabled);
            views.setTextColor(snoozeId, Color.parseColor("#6B7280"));
            views.setOnClickPendingIntent(snoozeId, null);

            views.setInt(dismissId, "setBackgroundResource", R.drawable.widget_btn_disabled);
            views.setTextColor(dismissId, Color.parseColor("#6B7280"));
            views.setOnClickPendingIntent(dismissId, null);
        }
    }

    public static void dismiss(Context context) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
        }
    }
}
