import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatAmount } from "./currency";

const PREFIX = "loan_notif_";

async function getIds(loanId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + loanId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveIds(loanId: string, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + loanId, JSON.stringify(ids));
  } catch {}
}

export async function scheduleLoanNotifications(params: {
  loanId: string;
  contactName: string;
  amount: number;
  currency: string;
  dueDate: string; // YYYY-MM-DD
  loanType: "lent" | "borrowed";
}): Promise<void> {
  await cancelLoanNotifications(params.loanId);

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const { loanId, contactName, amount, currency, dueDate, loanType } = params;
  const formatted = formatAmount(amount, currency);
  const now = new Date();

  const title =
    loanType === "lent"
      ? `Payment Reminder — ${contactName}`
      : `Repayment Reminder — ${contactName}`;

  const buildBody = (when: string) =>
    loanType === "lent"
      ? `${contactName} owes you ${formatted}. Due date: ${when}.`
      : `You need to repay ${formatted} to ${contactName}. Due date: ${when}.`;

  const schedule = async (date: Date, body: string): Promise<string | null> => {
    if (date <= now) return null;
    try {
      return await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
    } catch {
      return null;
    }
  };

  // 9:00 AM on due date
  const dueDateObj = new Date(dueDate + "T09:00:00");
  const ids: string[] = [];

  // 3 days before
  const d3 = new Date(dueDateObj);
  d3.setDate(d3.getDate() - 3);
  const id3 = await schedule(d3, buildBody("3 days"));
  if (id3) ids.push(id3);

  // 1 day before
  const d1 = new Date(dueDateObj);
  d1.setDate(d1.getDate() - 1);
  const id1 = await schedule(d1, buildBody("tomorrow"));
  if (id1) ids.push(id1);

  // On the day
  const idDay = await schedule(dueDateObj, buildBody("today"));
  if (idDay) ids.push(idDay);

  if (ids.length > 0) await saveIds(loanId, ids);
}

export async function cancelLoanNotifications(loanId: string): Promise<void> {
  const ids = await getIds(loanId);
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );
  await AsyncStorage.removeItem(PREFIX + loanId).catch(() => {});
}
