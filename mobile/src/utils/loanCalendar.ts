import * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { Loan } from "@/types";

const STORAGE_PREFIX = "loan_cal_";
const CALENDAR_NAME = "Balancy";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requestPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

/** Find existing Balancy calendar or create one. Returns calendar id. */
async function getOrCreateCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );
  const existing = calendars.find(
    (c) => c.title === CALENDAR_NAME && c.allowsModifications,
  );
  if (existing) return existing.id;

  if (Platform.OS === "ios") {
    // iOS: must use the default calendar's source
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    return await Calendar.createCalendarAsync({
      title: CALENDAR_NAME,
      color: "#1a56db",
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCal.source.id,
      source: defaultCal.source,
      name: CALENDAR_NAME,
      ownerAccount: "personal",
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  } else {
    // Android: use a local account source
    return await Calendar.createCalendarAsync({
      title: CALENDAR_NAME,
      color: "#1a56db",
      entityType: Calendar.EntityTypes.EVENT,
      source: {
        isLocalAccount: true,
        name: CALENDAR_NAME,
        type: "LOCAL",
      },
      name: CALENDAR_NAME,
      ownerAccount: "personal",
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add an all-day event to the phone calendar for the loan's due date.
 * Stores the resulting eventId in AsyncStorage for later removal.
 * Safe to call multiple times — silently removes any previous event first.
 */
export async function addLoanToCalendar(loan: Loan): Promise<void> {
  if (!loan.due_date) return;

  const granted = await requestPermission();
  if (!granted) return;

  // Remove any previous event for this loan before creating a new one
  await removeLoanFromCalendar(loan.id);

  const calendarId = await getOrCreateCalendar();

  const dueDate = new Date(loan.due_date);
  // All-day: start at midnight UTC, end next day
  const startDate = new Date(
    Date.UTC(
      dueDate.getUTCFullYear(),
      dueDate.getUTCMonth(),
      dueDate.getUTCDate(),
    ),
  );
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

  const typeLabel = loan.type === "lent" ? "owes you" : "you owe";
  const amountLabel = `${loan.amount} ${loan.currency}`;

  const eventId = await Calendar.createEventAsync(calendarId, {
    title: `📅 ${loan.contact_name} ${typeLabel} ${amountLabel}`,
    notes: loan.notes ?? `Loan tracked in Balancy`,
    startDate,
    endDate,
    allDay: true,
    timeZone: "UTC",
  });

  await AsyncStorage.setItem(`${STORAGE_PREFIX}${loan.id}`, eventId);
}

/**
 * Remove the calendar event for a loan (if one was created).
 */
export async function removeLoanFromCalendar(loanId: string): Promise<void> {
  const eventId = await AsyncStorage.getItem(`${STORAGE_PREFIX}${loanId}`);
  if (!eventId) return;

  try {
    await Calendar.deleteEventAsync(eventId);
  } catch {
    // Event may have been manually deleted — not an error
  }
  await AsyncStorage.removeItem(`${STORAGE_PREFIX}${loanId}`);
}
