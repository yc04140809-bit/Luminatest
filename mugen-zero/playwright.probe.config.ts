import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, testDir: './e2e', testMatch: '**/shotProbe.ts', workers: 1, retries: 0 });
