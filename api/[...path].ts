import { createApp } from "../server/app";

const app = createApp();

export default app;
export const config = { maxDuration: 60 };
