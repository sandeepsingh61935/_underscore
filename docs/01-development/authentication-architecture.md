# _underscore Authentication Architecture

## The Evolution of Chrome Extension Authentication

### The Old Way (Manifest V2 / Popup-based Auth)
In older Chrome Extensions, authentication was usually handled directly inside the Popup UI or via a persistent Background Page.
*   **The Flow:** The user clicks "Sign In" in the popup -> The popup calls `supabase.auth.signInWithOAuth()` -> Supabase redirects the popup window to Google (`accounts.google.com`) -> User logs in -> Google redirects back to Supabase (`yourproject.supabase.co/auth/v1/callback`) -> Supabase completes the login and redirects back to the extension popup.
*   **Why it broke:**
    1.  **Manifest V3:** Chrome replaced persistent Background Pages with Service Workers, which have no DOM and cannot perform standard browser URL redirects (`window.location.assign`).
    2.  **Popup Volatility:** If a user clicks outside the Chrome Extension popup while waiting for Google to load, the popup instantly closes, destroying the script and breaking the authentication flow mid-way.

### The New Architecture (Manifest V3 / Native Background Identity)
The new architecture moves the "brain" of authentication out of the fragile Popup UI and into the invincible Background Service Worker (`auth-manager.ts`).

Because the Service Worker cannot perform HTML redirects, it uses the official Google escaping hatch: `chrome.identity.launchWebAuthFlow()`.

*   **The Flow:**
    1.  User clicks "Sign In" in the popup.
    2.  The popup sends a message to the Background Script: "Start Google Login".
    3.  The Background Script builds a specific Google URL and calls `chrome.identity`.
    4.  Chrome itself opens a secure, native system window for the user to log in.
    5.  User logs in. Google redirects silently back to your pinned extension ID (`hecejpjek...chromiumapp.org`).
    6.  Chrome passes the secret `id_token` back to your Background Script.
    7.  Your Background Script sends the token secretly to Supabase over the network: `supabase.auth.signInWithIdToken({ token })`.
    8.  Supabase verifies the token and issues a session. The Background Script broadcasts to all open popups/content scripts: "User is Logged In!"

**The Benefits:**
*   Works perfectly in Manifest V3 Service Workers.
*   Does not break if the user closes the popup.
*   Centralizes session management so content scripts, sidebars, and popups all instantly share the same Auth State.

---

## Step-by-Step Setup Pipeline

Here is exactly how to configure the entire pipeline for Google, Email/Password, and future OAuth providers (like Apple).

### Step 1: Pin Your Extension ID
Your extension must have a permanent ID so Google knows where to send the token. You already did this!
*   Your `wxt.config.ts` has a permanent `key`.
*   Your permanent Extension ID is: `hecejpjekcgpifnemddfmkjmphmgljlm`
*   Your permanent Redirect URI is: `https://hecejpjekcgpifnemddfmkjmphmgljlm.chromiumapp.org/`

### Step 2: Configure Google Cloud Console

Because we are bypassing standard redirects, you need **two sets** of Google Credentials.

#### A. The Web Client (For Supabase validation & future Web Apps)
This tells Google that Supabase is allowed to manage users for you.
1.  Go to **Google Cloud Console > APIs & Services > Credentials**.
2.  Click **CREATE CREDENTIALS > OAuth client ID**.
3.  Application type: **Web application**.
4.  Authorized JavaScript origins: `https://[YOUR_SUPABASE_PROJECT_ID].supabase.co`
5.  Authorized redirect URIs: `https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback`
6.  *Save the Client ID and Client Secret.*

#### B. The Chrome Client (For your Extension Background Script)
This authorizes your specific Chrome Extension to ask Google for tokens natively.
1.  Click **CREATE CREDENTIALS > OAuth client ID**.
2.  Application type: **Chrome extension**.
3.  Item ID: Paste your pinned Extension ID (`hecejpjekcgpifnemddfmkjmphmgljlm`).
4.  *Save the Client ID (e.g., `753957667832-vmlcu...`).*

### Step 3: Configure Supabase

Now we tell Supabase about both of the Google Clients we just made.

#### A. Enable Google Provider
1.  Go to **Supabase Dashboard > Authentication > Providers > Google**.
2.  Turn it **ON**.
3.  Paste the **Web application** Client ID and Client Secret from Step 2A into the main boxes.

#### B. Authorize the Chrome App
1.  Scroll down to the **Authorized Client IDs** section in the Google Provider settings.
2.  Paste the **Chrome extension** Client ID from Step 2B (`753957667832-vmlcu...`) into the box.
3.  Click **Save**.

#### C. Enable Email/Password (Optional but Recommended)
1.  Go to **Supabase Dashboard > Authentication > Providers > Email**.
2.  Ensure "Enable Email/Password Sign in" is ON.
3.  (Optional) If you want users to log in immediately without verifying their email first, turn OFF "Confirm email".

### Step 4: Finalize Extension Code (`auth-manager.ts`)

With the dashboards configured, the code setup is incredibly simple.

#### For Google:
In `auth-manager.ts`, ensure `googleClientId` matches the **Chrome app** Client ID (Step 2B).
```typescript
const googleClientId = '753957667832-vmlcua87mf5umcbkbj93e4uu8qdfa9rj.apps.googleusercontent.com';
// ... builds authUrl ...
const browserResponseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl });
// extracts token, logs into supabase natively
await this.supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
```

#### For Email/Password:
Because Email/Password does not use OAuth or redirects, the background script just passes the strings directly to Supabase over the network.
```typescript
await this.supabase.auth.signInWithPassword({ email, password });
```

#### For Future Providers (e.g., Apple):
You will follow the exact same pattern as Google:
1.  Create a "Service ID" or App ID in the Apple Developer Portal.
2.  In Supabase, put the Apple credentials in the main Apple Provider settings.
3.  In Apple's Developer Portal, add your specific Chrome Extension URL (`https://hecejpjek...chromiumapp.org/`) as an authorized return destination.
4.  In `auth-manager.ts`, add an `else if (provider === 'apple')` block that builds Apple's specific `https://appleid.apple.com/...` URL and passes it to `chrome.identity.launchWebAuthFlow`.
