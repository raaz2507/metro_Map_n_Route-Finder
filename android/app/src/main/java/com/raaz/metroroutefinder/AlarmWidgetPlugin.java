package com.raaz.metroroutefinder;

import android.Manifest;
import android.content.Context;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "AlarmWidget",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class AlarmWidgetPlugin extends Plugin {

    private static AlarmWidgetPlugin activeInstance;

    @Override
    public void load() {
        super.load();
        activeInstance = this;
        AlarmNotificationManager.createChannels(getContext());

        // On first app launch, if persistent notification is enabled, show the standby pass!
        AlarmStateRepository.AlarmModel model = AlarmStateRepository.getState(getContext());
        if (model.persistentNotifEnabled) {
            AlarmNotificationManager.updateNotification(getContext(), model);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (activeInstance == this) {
            activeInstance = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getPermissionState("notifications") != PermissionState.GRANTED) {
                requestPermissionForAlias("notifications", call, "notificationPermCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void notificationPermCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void setPersistentNotification(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        Context context = getContext();
        AlarmStateRepository.savePersistentSetting(context, enabled);

        AlarmStateRepository.AlarmModel model = AlarmStateRepository.getState(context);
        AlarmNotificationManager.updateNotification(context, model);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String stationName = call.getString("stationName", "No Alarm Set");
        String status = call.getString("status", "STANDBY");
        String distance = call.getString("distance", "---");
        Boolean isRinging = call.getBoolean("isRinging", false);
        Boolean isActive = call.getBoolean("isActive", false);

        Boolean hasRoute = call.getBoolean("hasRoute", null);
        String startStation = call.getString("startStation", null);
        String endStation = call.getString("endStation", null);
        String timeText = call.getString("timeText", null);
        String distanceText = call.getString("distanceText", null);
        String fareText = call.getString("fareText", null);

        Context context = getContext();

        if (hasRoute != null || startStation != null) {
            AlarmStateRepository.saveFullState(
                    context,
                    stationName,
                    status,
                    distance,
                    isRinging != null && isRinging,
                    isActive != null && isActive,
                    hasRoute != null && hasRoute,
                    startStation,
                    endStation,
                    timeText,
                    distanceText,
                    fareText
            );
        } else {
            AlarmStateRepository.saveAlarmState(
                    context,
                    stationName,
                    status,
                    distance,
                    isRinging != null && isRinging,
                    isActive != null && isActive
            );
        }

        // 1. Update Home Screen Widget
        AlarmWidgetProvider.updateAllWidgets(context);

        // 2. Update Unified Status Bar Notification
        AlarmStateRepository.AlarmModel model = AlarmStateRepository.getState(context);
        AlarmNotificationManager.updateNotification(context, model);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateRoute(PluginCall call) {
        boolean hasRoute = call.getBoolean("hasRoute", false);
        String startStation = call.getString("startStation", "");
        String endStation = call.getString("endStation", "");
        String timeText = call.getString("timeText", "-- min");
        String distanceText = call.getString("distanceText", "-- km");
        String fareText = call.getString("fareText", "₹--");

        Context context = getContext();
        AlarmStateRepository.saveRouteState(context, hasRoute, startStation, endStation, timeText, distanceText, fareText);

        AlarmStateRepository.AlarmModel model = AlarmStateRepository.getState(context);
        AlarmNotificationManager.updateNotification(context, model);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getWidgetState(PluginCall call) {
        AlarmStateRepository.AlarmModel model = AlarmStateRepository.getState(getContext());
        JSObject ret = new JSObject();
        ret.put("stationName", model.stationName);
        ret.put("status", model.status);
        ret.put("distance", model.distance);
        ret.put("isRinging", model.isRinging);
        ret.put("isActive", model.isActive);
        ret.put("hasRoute", model.hasRoute);
        ret.put("startStation", model.startStation);
        ret.put("endStation", model.endStation);
        ret.put("timeText", model.timeText);
        ret.put("distanceText", model.distanceText);
        ret.put("fareText", model.fareText);
        ret.put("persistentNotifEnabled", model.persistentNotifEnabled);
        ret.put("notifStyle", model.notifStyle);
        ret.put("themeId", model.themeId);
        ret.put("themeAccent", model.themeAccent);
        call.resolve(ret);
    }

    @PluginMethod
    public void setNotificationStyle(PluginCall call) {
        String style = call.getString("style", "boarding_pass");
        Context context = getContext();
        AlarmStateRepository.saveNotifStyle(context, style);

        AlarmStateRepository.AlarmModel model = AlarmStateRepository.getState(context);
        AlarmNotificationManager.updateNotification(context, model);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("style", style);
        call.resolve(ret);
    }

        @PluginMethod
    public void updateTheme(PluginCall call) {
        String themeId = call.getString("themeId", "classic");
        String accent = call.getString("accentColor", "#2563eb");
        String bg = call.getString("bgColor", "#1e293b");
        String surface = call.getString("surfaceColor", "#0f172a");
        String text = call.getString("textColor", "#f8fafc");

        Context context = getContext();
        AlarmStateRepository.saveThemeState(context, themeId, accent, bg, surface, text);

        // 1. Update Home Screen Widgets with new theme
        AlarmWidgetProvider.updateAllWidgets(context);

        // 2. Update Notification Pass with new theme
        AlarmStateRepository.AlarmModel model = AlarmStateRepository.getState(context);
        AlarmNotificationManager.updateNotification(context, model);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("themeId", themeId);
        call.resolve(ret);
    }

    @PluginMethod
    public void testNotification(PluginCall call) {
        String style = call.getString("style", null);
        Context context = getContext();
        if (style != null && !style.isEmpty()) {
            AlarmStateRepository.saveNotifStyle(context, style);
        }

        // Create sample mock test pass to preview on device
        AlarmStateRepository.AlarmModel curState = AlarmStateRepository.getState(context);
        AlarmStateRepository.AlarmModel testModel = new AlarmStateRepository.AlarmModel(
                "Rajiv Chowk (Interchange)",
                "APPROACHING",
                "850m",
                false,
                true,
                true,
                "Kashmere Gate",
                "Hauz Khas",
                "38 min",
                "18.4 km",
                "₹40",
                true,
                style != null ? style : curState.notifStyle,
                curState.themeId,
                curState.themeAccent,
                curState.themeBg,
                curState.themeSurface,
                curState.themeText
        );

        AlarmNotificationManager.updateNotification(context, testModel);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void dismissNotification(PluginCall call) {
        AlarmNotificationManager.dismiss(getContext());
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    public static void dispatchAction(String action) {
        if (activeInstance != null) {
            JSObject ret = new JSObject();
            ret.put("action", action);
            activeInstance.notifyListeners("onWidgetAction", ret);
        }
    }
}
