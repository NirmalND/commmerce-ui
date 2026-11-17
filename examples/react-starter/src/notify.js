// Toasts, in or out of the Commmerce admin.
//
// - Inside the admin: the admin opens your app in a frame with ?host=… in the address. The app then connects
//   with App Bridge and asks the admin to show the toast over the whole admin (app.toast.show).
// - Anywhere else (npm run dev, your own site): an in-page cm-toast, through showToast().
//
// Only this file knows about App Bridge. Delete it and call showToast() directly if your app never runs in the admin.
import { showToast } from '@commmerce/ui-react';
import { createApp } from '@commmerce/app-bridge';

// The admin's origin comes from your app settings, never from code: put it in .env.local as
// VITE_COMMMERCE_ADMIN_ORIGIN=https://*.commmerce.com (any Commmerce admin) or one exact origin.
const ADMIN_ORIGIN = import.meta.env.VITE_COMMMERCE_ADMIN_ORIGIN;
const API_KEY = import.meta.env.VITE_COMMMERCE_API_KEY;

function connect() {
  const embedded = window.self !== window.top && new URLSearchParams(location.search).has('host');
  if (!embedded || !ADMIN_ORIGIN) return null;
  try {
    const app = createApp({ hostOrigin: ADMIN_ORIGIN, apiKey: API_KEY });
    app.autoResize(); // the admin sizes its frame to this page
    return app;
  } catch (err) {
    console.warn('App Bridge not connected, using in-page toasts:', err.message);
    return null;
  }
}

const app = connect();

/** Shows a short confirmation: the admin's toast when connected, otherwise an in-page one. */
export async function notify(message) {
  if (app) {
    try {
      await app.ready;
      await app.toast.show(message);
      return;
    } catch {
      // The admin did not answer (for example, its App Bridge host is not live yet): fall back.
    }
  }
  showToast(message);
}
