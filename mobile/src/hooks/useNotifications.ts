import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Loan } from "@/types";

// ─── Configure notification handler ─────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Permission + token registration ─────────────────────────────────────────

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Balancy",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1a56db",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId || projectId === "YOUR_EAS_PROJECT_ID") {
    throw new Error(
      "No EAS projectId found.\n\nRun: npx eas init\n\nThis links the app to your Expo account and sets the projectId in app.json.",
    );
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

// ─── Schedule local reminders ─────────────────────────────────────────────────

const IDENTIFIER_PREFIX = "loan_";

export async function scheduleRemindersForLoan(loan: Loan) {
  if (!loan.due_date || loan.status === "paid") return;

  const dueDate = new Date(loan.due_date);
  const now = new Date();

  // Cancel existing reminders for this loan first
  await cancelRemindersForLoan(loan.id);

  // Helper: schedule if fire time is in the future
  const scheduleIfFuture = async (fireDate: Date, body: string, id: string) => {
    if (fireDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${IDENTIFIER_PREFIX}${loan.id}_${id}`,
        content: {
          title: "Balancy",
          body,
          data: { loanId: loan.id },
          sound: true,
        },
        trigger: {
          date: fireDate,
          type: Notifications.SchedulableTriggerInputTypes.DATE,
        },
      });
    }
  };

  // 3 days before
  const threeDays = new Date(dueDate);
  threeDays.setDate(threeDays.getDate() - 3);
  threeDays.setHours(9, 0, 0, 0);
  await scheduleIfFuture(
    threeDays,
    `${loan.contact_name}: ${loan.amount} ${loan.currency} due in 3 days`,
    "3d",
  );

  // 1 day before
  const oneDay = new Date(dueDate);
  oneDay.setDate(oneDay.getDate() - 1);
  oneDay.setHours(9, 0, 0, 0);
  await scheduleIfFuture(
    oneDay,
    `${loan.contact_name}: ${loan.amount} ${loan.currency} due tomorrow!`,
    "1d",
  );

  // On due date
  const onDue = new Date(dueDate);
  onDue.setHours(8, 0, 0, 0);
  await scheduleIfFuture(
    onDue,
    `${loan.contact_name}: ${loan.amount} ${loan.currency} is due today!`,
    "0d",
  );
}

export async function cancelRemindersForLoan(loanId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.identifier.startsWith(`${IDENTIFIER_PREFIX}${loanId}`)) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

export async function scheduleRemindersForAllLoans(loans: Loan[]) {
  for (const loan of loans) {
    await scheduleRemindersForLoan(loan);
  }
}
