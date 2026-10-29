package com.raaz.metroroutefinder;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

public class AlarmWidgetProvider extends AppWidgetProvider {

    public static int getCardBackgroundForTheme(String themeId) {
        if (themeId == null) return R.drawable.widget_bg_card_classic;
        switch (themeId.toLowerCase()) {
            case "comic": return R.drawable.widget_bg_card_comic;
            case "anime": return R.drawable.widget_bg_card_anime;
            case "cyberpunk": return R.drawable.widget_bg_card_cyberpunk;
            case "pixel": return R.drawable.widget_bg_card_pixel;
            case "chamgadar": return R.drawable.widget_bg_card_chamgadar;
            case "makad-manav":
            case "makad_manav": return R.drawable.widget_bg_card_makad_manav;
            case "classic":
            default: return R.drawable.widget_bg_card_classic;
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        AlarmStateRepository.AlarmModel model = AlarmStateRepository.getState(context);
        for (int appWidgetId : appWidgetIds) {
            renderWidget(context, appWidgetManager, appWidgetId, model);
        }
    }

    public static void renderWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId, AlarmStateRepository.AlarmModel model) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_alarm_layout);

        // Apply Themed Card Background
        views.setInt(R.id.widget_root, "setBackgroundResource", getCardBackgroundForTheme(model.themeId));

        int accentColor;
        try {
            accentColor = Color.parseColor(model.themeAccent != null ? model.themeAccent : "#2563eb");
        } catch (Exception e) {
            accentColor = Color.parseColor("#2563eb");
        }

        views.setTextViewText(R.id.widget_station_name, model.stationName);
        views.setTextViewText(R.id.widget_status_label, model.status);
        views.setTextViewText(R.id.widget_live_distance, "📍 " + model.distance);

        if (model.isRinging) {
            views.setTextViewText(R.id.widget_pod_icon, "🚨");
            views.setInt(R.id.widget_pod_icon, "setBackgroundResource", R.drawable.widget_pod_circle);
            views.setTextViewText(R.id.widget_pod_label, "ALERT");
            views.setTextColor(R.id.widget_pod_label, Color.parseColor("#EF4444"));

            views.setTextViewText(R.id.widget_screen_icon, "🚨");
            views.setTextColor(R.id.widget_station_name, Color.parseColor("#EF4444"));
            views.setTextColor(R.id.widget_status_label, Color.parseColor("#EF4444"));
        } else if (model.isActive) {
            views.setTextViewText(R.id.widget_pod_icon, "🔔");
            views.setInt(R.id.widget_pod_icon, "setBackgroundResource", R.drawable.widget_pod_circle);
            views.setTextViewText(R.id.widget_pod_label, "ACTIVE");
            views.setTextColor(R.id.widget_pod_label, accentColor);

            views.setTextViewText(R.id.widget_screen_icon, "🔔");
            views.setTextColor(R.id.widget_station_name, Color.parseColor("#FACC15"));
            views.setTextColor(R.id.widget_status_label, Color.parseColor("#22C55E"));
        } else {
            views.setTextViewText(R.id.widget_pod_icon, "🔔");
            views.setInt(R.id.widget_pod_icon, "setBackgroundResource", R.drawable.widget_pod_inactive);
            views.setTextViewText(R.id.widget_pod_label, "ALARM");
            views.setTextColor(R.id.widget_pod_label, Color.parseColor("#6B7280"));

            views.setTextViewText(R.id.widget_screen_icon, "🔔");
            views.setTextColor(R.id.widget_station_name, accentColor);
            views.setTextColor(R.id.widget_status_label, Color.parseColor("#9CA3AF"));
        }

        views.setViewVisibility(R.id.widget_actions_container, View.VISIBLE);
        views.setViewVisibility(R.id.widget_btn_snooze, View.VISIBLE);
        views.setViewVisibility(R.id.widget_btn_dismiss, View.VISIBLE);

        if (model.isActive) {
            views.setInt(R.id.widget_btn_snooze, "setBackgroundResource", R.drawable.widget_btn_snooze);
            views.setTextColor(R.id.widget_btn_snooze, Color.parseColor("#FBBF24"));

            views.setInt(R.id.widget_btn_dismiss, "setBackgroundResource", R.drawable.widget_btn_dismiss);
            views.setTextColor(R.id.widget_btn_dismiss, Color.parseColor("#F87171"));

            // Unified Snooze Intent -> AlarmActionReceiver
            Intent snoozeIntent = new Intent(context, AlarmActionReceiver.class);
            snoozeIntent.setAction(AlarmStateRepository.ACTION_SNOOZE_ALARM);
            PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
                    context, 1, snoozeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_btn_snooze, snoozePendingIntent);

            // Unified Dismiss Intent -> AlarmActionReceiver
            Intent dismissIntent = new Intent(context, AlarmActionReceiver.class);
            dismissIntent.setAction(AlarmStateRepository.ACTION_DISMISS_ALARM);
            PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
                    context, 2, dismissIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_btn_dismiss, dismissPendingIntent);
        } else {
            views.setInt(R.id.widget_btn_snooze, "setBackgroundResource", R.drawable.widget_btn_disabled);
            views.setTextColor(R.id.widget_btn_snooze, Color.parseColor("#6B7280"));

            views.setInt(R.id.widget_btn_dismiss, "setBackgroundResource", R.drawable.widget_btn_disabled);
            views.setTextColor(R.id.widget_btn_dismiss, Color.parseColor("#6B7280"));

            views.setOnClickPendingIntent(R.id.widget_btn_snooze, null);
            views.setOnClickPendingIntent(R.id.widget_btn_dismiss, null);
        }

        // Tap on card opens MainActivity
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, openAppPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, AlarmWidgetProvider.class);
        int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        if (allWidgetIds != null && allWidgetIds.length > 0) {
            AlarmStateRepository.AlarmModel model = AlarmStateRepository.getState(context);
            for (int widgetId : allWidgetIds) {
                renderWidget(context, appWidgetManager, widgetId, model);
            }
        }
    }
}
