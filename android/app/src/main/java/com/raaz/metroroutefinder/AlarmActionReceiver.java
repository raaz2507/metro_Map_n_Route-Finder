package com.raaz.metroroutefinder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class AlarmActionReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();

        if (AlarmStateRepository.ACTION_DISMISS_ALARM.equals(action)) {
            // 1. Reset Shared State
            AlarmStateRepository.saveAlarmState(context, "No Alarm Set", "STANDBY", "---", false, false);

            // 2. Update Home Screen Widget
            AlarmWidgetProvider.updateAllWidgets(context);

            // 3. Clear Status Bar Notification (if no route)
            AlarmNotificationManager.updateNotification(context, AlarmStateRepository.getState(context));

            // 4. Dispatch Event to JavaScript Webview
            AlarmWidgetPlugin.dispatchAction("DISMISS");

        } else if (AlarmStateRepository.ACTION_SNOOZE_ALARM.equals(action)) {
            // 1. Update State to Snoozed
            AlarmStateRepository.AlarmModel current = AlarmStateRepository.getState(context);
            AlarmStateRepository.saveAlarmState(context, current.stationName, "SNOOZED", current.distance, false, true);

            // 2. Update Home Screen Widget
            AlarmWidgetProvider.updateAllWidgets(context);

            // 3. Update Notification with Snoozed state
            AlarmNotificationManager.updateNotification(context, AlarmStateRepository.getState(context));

            // 4. Dispatch Event to JavaScript Webview
            AlarmWidgetPlugin.dispatchAction("SNOOZE");
        }
    }
}
