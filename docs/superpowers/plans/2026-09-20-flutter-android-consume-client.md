# Flutter Android-First Consume Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **HARD GATE:** Do not execute Task 1 or later until ADR-031 kill test is met (one week of authenticated `library_open` from `client=phone` or `client=tablet`). Task 0 is the only task allowed before that.

**Goal:** After the web kill test, ship a Flutter consume app (Play first, iOS compiles) that shows the signed-in Account library, search, and text-fragment open — no capture, Ask, guest, MCP, or vault.

**Architecture:** New Dart app at `apps/mobile`. Talks to the same Supabase project as the web app (anon key, user JWT, existing highlights table). No second event store. No Capacitor. Web remains the browser product.

**Tech Stack:** Flutter 3.24 or newer, Dart 3.5 or newer, `supabase_flutter`, `google_sign_in`, `url_launcher`, `go_router`. Android Gradle applicationId `com.underscore.app` (change only if Play console already reserved another id).

**Spec:** `docs/superpowers/specs/2026-09-20-phone-tablet-consume-prd.md`

**ADR:** `docs/04-adrs/031-mobile-consume-clients.md`

**OD inspiration (visual only):** `/home/sandy/projects/open-design/.od/projects/77039981-726c-431d-8a7a-ae9f169bba0c/underscore-flutter-app-prototype.html`

## Global Constraints

- Execute **Task 0 first**. If it fails, stop the plan. Do not create `apps/mobile`.
- Consume-only: Home recent, Library search/open, Settings account/sign-out/appearance.
- No Ask tab, no guest mode, no current-page highlighter, no Edit/Delete/Note/Tag writes.
- No MCP, vault folder, push, widgets, share extension.
- Paper / ink / accent via Flutter `ColorScheme` mapped from V2 tokens; no purple AI chrome; no Material 3 purple default as brand.
- One codebase; `flutter build apk` (or appbundle) is the first store artifact; `flutter build ios` must compile but is not submitted in this plan.
- Secrets: `--dart-define` or env files gitignored. Never commit Supabase service role.
- Conventional commits: `feat(mobile): ...`. No emoji.

## File map (after gate)

| Path | Responsibility |
|------|----------------|
| `apps/mobile/pubspec.yaml` | Flutter package |
| `apps/mobile/lib/main.dart` | `Supabase.initialize` + `UnderscoreApp` |
| `apps/mobile/lib/theme/editorial_theme.dart` | V2 token mapping |
| `apps/mobile/lib/auth/auth_gate.dart` | Session → shell or sign-in |
| `apps/mobile/lib/auth/google_sign_in_button.dart` | Google + Supabase |
| `apps/mobile/lib/data/highlight_dto.dart` | Row mapping |
| `apps/mobile/lib/data/library_repository.dart` | Supabase select for current user |
| `apps/mobile/lib/shell/app_shell.dart` | 3-tab NavigationBar: Home, Library, Settings |
| `apps/mobile/lib/features/home/home_screen.dart` | Recent list, read-only |
| `apps/mobile/lib/features/library/library_screen.dart` | Search + domain list + open |
| `apps/mobile/lib/features/settings/settings_screen.dart` | Account, sign out, theme |
| `apps/mobile/lib/open/text_fragment.dart` | Port of `buildTextFragmentUrl` |
| `apps/mobile/test/text_fragment_test.dart` | Fragment syntax |
| `apps/mobile/test/library_repository_test.dart` | Mapping tests |

Do not add this tree to the WXT extension build. Root `package.json` scripts may gain `"mobile:test": "cd apps/mobile && flutter test"` only.

---

### Task 0: Kill-test gate (the only pre-Flutter task)

**Files:** none

- [ ] **Step 1: Read analytics**

Confirm at least seven consecutive days with authenticated `library_open` events where `props.client` is `phone` or `tablet` in Cloudflare logs / `/api/analytics` output.

If the sink from the web plan is not deployed, **stop**. Finish `docs/superpowers/plans/2026-09-20-web-phone-tablet-consume.md` first.

- [ ] **Step 2: Written go**

Product replies "lift ADR-031 freeze" in the tracking issue. Without that sentence, do not run Task 1.

- [ ] **Step 3: If gate fails**

```bash
# no-op — do not create apps/mobile
```

Expected: no Dart files in git.

---

### Task 1: Scaffold Flutter app

**Files:**
- Create: `apps/mobile/**` via Flutter CLI

**Interfaces:**
- Consumes: gate passed
- Produces: `apps/mobile` compiles `flutter test`

- [ ] **Step 1: Create**

```bash
mkdir -p apps
cd apps
flutter create --org com.underscore --project-name underscore_mobile --platforms android,ios mobile
```

Expected: `apps/mobile/lib/main.dart` exists.

- [ ] **Step 2: Add `.gitignore` entries if the Flutter template is incomplete**

Ensure `apps/mobile/.dart_tool/`, `build/`, `*.iml` are ignored.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile
git commit -m "chore(mobile): scaffold Flutter consume app"
```

---

### Task 2: Editorial theme + three-tab shell

**Files:**
- Create: `apps/mobile/lib/theme/editorial_theme.dart`
- Create: `apps/mobile/lib/shell/app_shell.dart`
- Modify: `apps/mobile/lib/main.dart`

**Interfaces:**
- Produces: `ThemeData editorialTheme({required bool dark})`, `AppShell` with 3 destinations

Token mapping (approximate V2; hex only in the Dart theme file, never in web TSX):

```dart
// apps/mobile/lib/theme/editorial_theme.dart
import 'package:flutter/material.dart';

const paper = Color(0xFFF7F4EF);
const ink = Color(0xFF1C1917);
const accent = Color(0xFFC45C26);

ThemeData editorialTheme({required bool dark}) {
  final scheme = ColorScheme(
    brightness: dark ? Brightness.dark : Brightness.light,
    primary: accent,
    onPrimary: paper,
    secondary: ink,
    onSecondary: paper,
    surface: paper,
    onSurface: ink,
    error: const Color(0xFFB42318),
    onError: paper,
  );
  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    scaffoldBackgroundColor: paper,
  );
}
```

Shell: `NavigationBar` items Home, Library, Settings only. **No Ask.**

- [ ] **Step 1: Widget test — 3 destinations, no Ask label**

```dart
// apps/mobile/test/app_shell_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:underscore_mobile/shell/app_shell.dart';

void main() {
  testWidgets('shell has three tabs and no Ask', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AppShell()));
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Library'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Ask'), findsNothing);
  });
}
```

(Adjust imports if `AppShell` needs `MaterialApp` ancestor only.)

- [ ] **Step 2: Run `cd apps/mobile && flutter test test/app_shell_test.dart` — FAIL then implement until PASS**

- [ ] **Step 3: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): editorial theme and three-tab consume shell"
```

---

### Task 3: Text fragment helper (port)

**Files:**
- Create: `apps/mobile/lib/open/text_fragment.dart`
- Create: `apps/mobile/test/text_fragment_test.dart`

Port behavior from `src/shared/utils/text-fragment.ts`: `#:~:text=` with optional prefix/suffix; preserve existing `#anchor`.

```dart
String buildTextFragmentUrl(String baseUrl, {required String exact}) {
  final encoded = Uri.encodeComponent(exact.trim());
  final directive = ':~:text=$encoded';
  final cleaned = baseUrl.replaceFirst(RegExp(r':~:text=.*$'), '');
  if (cleaned.contains('#')) {
    if (cleaned.endsWith('#')) return '$cleaned$directive';
    return '$cleaned$directive';
  }
  return '$cleaned#$directive';
}
```

Tests:

- `https://example.com/article` + `remarkable insight` contains `#:~:text=remarkable%20insight`
- URL with `#section` keeps the section and appends `:~:text=`

- [ ] **Step 1: Failing tests**
- [ ] **Step 2: Implement until `flutter test test/text_fragment_test.dart` PASS**
- [ ] **Step 3: Commit `feat(mobile): port text fragment URLs`**

---

### Task 4: Supabase auth (Google)

**Files:**
- Create: `apps/mobile/lib/auth/auth_gate.dart`
- Create: `apps/mobile/lib/auth/google_sign_in_button.dart`
- Modify: `apps/mobile/lib/main.dart`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_ANON_KEY` via `--dart-define`
- Produces: signed-in `Session` or sign-in screen. No guest library.

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );
  runApp(const UnderscoreApp());
}
```

`AuthGate`: if `Supabase.instance.client.auth.currentSession == null` show sign-in; else `AppShell`.

Do not implement Sign in with Apple in this plan (Play first). iOS compile may show Google-only until a later ADR.

- [ ] **Step 1: Manual — Google Cloud + Supabase redirect for Android**
- [ ] **Step 2: Sign-in screen copy: "Sign in to see your library" / "Highlight on desktop with the extension"**
- [ ] **Step 3: Commit `feat(mobile): Google sign-in gate for consume app`**

---

### Task 5: Library repository (read-only)

**Files:**
- Create: `apps/mobile/lib/data/highlight_dto.dart`
- Create: `apps/mobile/lib/data/library_repository.dart`
- Create: `apps/mobile/test/highlight_dto_test.dart`

Map the same columns the web hook reads (id, domain, path, quote, note, tags, savedAt / created_at). **No insert/update/delete methods.**

```dart
class LibraryRepository {
  LibraryRepository(this._client);
  final SupabaseClient _client;

  Future<List<HighlightDto>> listMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return [];
    final rows = await _client
        .from('highlights')
        .select()
        .eq('user_id', uid)
        .order('created_at', ascending: false);
    return (rows as List).map((r) => HighlightDto.fromJson(r)).toList();
  }
}
```

Confirm table/column names against `src/web/hooks/useWebLibrary.ts` before writing `fromJson`. If the web hook uses a view or RPC, call that instead of guessing.

- [ ] **Step 1: Read `useWebLibrary.ts` and copy the query shape**
- [ ] **Step 2: DTO unit tests from fixture JSON**
- [ ] **Step 3: Commit `feat(mobile): read-only cloud library repository`**

---

### Task 6: Home + Library screens

**Files:**
- Create: `apps/mobile/lib/features/home/home_screen.dart`
- Create: `apps/mobile/lib/features/library/library_screen.dart`

Home: recent N quotes, domain line, Open action.

Library: search field (filter locally), domain grouping, highlight card with Copy + Open.

Open: `launchUrl(Uri.parse(buildTextFragmentUrl(...)), mode: LaunchMode.externalApplication)`.

No delete, no note editor, no tag editor, no current-page band from the OD mock.

Tablet: `NavigationRail` when `shortestSide >= 600` instead of `NavigationBar`; library as two panes (domain list | detail). Reuse the same screens.

- [ ] **Step 1: Golden or widget test — Open button present, Delete absent**
- [ ] **Step 2: Implement until tests PASS**
- [ ] **Step 3: Commit `feat(mobile): read-only home and library screens`**

---

### Task 7: Settings (stripped)

**Files:**
- Create: `apps/mobile/lib/features/settings/settings_screen.dart`

Sections: account email, sign out, appearance (light/dark/system).

**Do not** add Integrations, vault folder, MCP, API keys, keyboard cheatsheet.

- [ ] **Step 1: Widget test finds Sign out, does not find Integrations or Vault**
- [ ] **Step 2: Commit `feat(mobile): stripped account settings`**

---

### Task 8: Android first artifact; iOS compile only

**Files:**
- Modify: `apps/mobile/android/app/build.gradle` applicationId if needed
- Modify: CI only if a mobile workflow is added under `.github/workflows/mobile.yml`

- [ ] **Step 1: `cd apps/mobile && flutter build appbundle --release --dart-define=...`**

Expected: `build/app/outputs/bundle/release/app-release.aab`

- [ ] **Step 2: `flutter build ios --no-codesign` on a Mac CI or document as required follow-up**

Expected: compile success. **Do not** submit to App Store in this plan.

- [ ] **Step 3: Play Console upload is an ops step, not a code step. Stop after a local/CI AAB.**

- [ ] **Step 4: Commit CI workflow if added: `ci(mobile): test and Android bundle`**

---

## Self-review

| Spec item | Task |
| --- | --- |
| Freeze until kill test | Task 0 |
| Flutter one codebase, Play first | Tasks 1, 8 |
| Consume-only, no Ask/guest/edit | Tasks 2, 6, 7 |
| Text fragment open | Tasks 3, 6 |
| Google auth, no guest vault | Task 4 |
| Tablet two-pane | Task 6 |
| No MCP/vault | Task 7 |
