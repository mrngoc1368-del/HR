import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { config } from './config.js';

await migrate();
createApp().listen(config.port, () => console.log(`API on :${config.port}`));
