
import { db } from '../src/db';
import { settings } from '../src/db/schema';

async function checkSettings() {
    try {
        console.log('Fetching all settings...');
        const allSettings = await db.select().from(settings);
        console.log('Current Settings:', JSON.stringify(allSettings, null, 2));
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
}

checkSettings();
