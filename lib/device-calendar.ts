import * as Calendar from 'expo-calendar';
import { Alert, Platform } from 'react-native';

export async function addJobToDeviceCalendar(params: {
  jobTitle: string;
  jobAddress: string;
  startDate: Date;
}): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Calendar Access Denied',
        'Please enable calendar access in Settings to save booked jobs to your calendar.',
      );
      return false;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.filter((c) => c.allowsModifications);

    // Prefer the device's default/primary calendar
    let target: Calendar.Calendar | undefined;
    if (Platform.OS === 'ios') {
      // Prefer iCloud (CALDAV) then local, then any writable
      target =
        writable.find((c) => c.source?.type === Calendar.SourceType.CALDAV) ??
        writable.find((c) => c.source?.type === Calendar.SourceType.LOCAL) ??
        writable[0];
    } else {
      target = writable.find((c) => c.isPrimary) ?? writable[0];
    }

    if (!target) {
      console.error('[device-calendar] No writable calendar found. Available:', JSON.stringify(calendars.map((c) => ({ id: c.id, title: c.title, type: c.source?.type, allows: c.allowsModifications }))));
      Alert.alert('No Calendar Found', 'Could not find a writable calendar on this device.');
      return false;
    }

    const endDate = new Date(params.startDate);
    endDate.setHours(endDate.getHours() + 2);

    await Calendar.createEventAsync(target.id, {
      title: `Trust-a-Tradie: ${params.jobTitle}`,
      location: params.jobAddress,
      startDate: params.startDate,
      endDate,
      notes: 'Booked via Trust-a-Tradie',
      alarms: [{ relativeOffset: -60 }],
    });

    Alert.alert('Added to Calendar', `"${params.jobTitle}" has been saved to your ${target.title} calendar.`);
    return true;
  } catch (e) {
    console.error('[device-calendar] createEventAsync failed:', e);
    Alert.alert('Calendar Error', 'Could not save the event to your calendar. Please try again.');
    return false;
  }
}
