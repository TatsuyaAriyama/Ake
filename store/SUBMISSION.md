# Suzaku — iOS Submission Checklist

App: **Suzaku — Tokyo Compass** (朱雀) · Bundle ID `com.tatsuyaariyama.suzaku`
Target: **v1.2.0 (build 3)**

Requires macOS with Xcode + CocoaPods installed. Run from the repo root.

---

## 1. Build the web app

```bash
npm install
npm run build            # tsc -b && vite build → dist/
```

## 2. Generate icons & splash

```bash
npm run assets:prepare   # scripts/rasterizeAssets.mjs → resources/*.png, assets/*.png, store/AppStore-marketing-icon-1024.png
# (run after `cap add ios` below so native output has a target)
```

## 3. Add the iOS platform

```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
```

## 4. Apply icons/splash to native

```bash
npm run assets:generate  # capacitor-assets generate … writes into ios/
npx cap sync ios
```

## 5. Merge native config (manual, one-time)

From `native/ios/` into the generated Xcode project (`ios/App/App/`):

- **Info.plist** — merge the keys in `native/ios/Info.plist.additions.xml`
  into `ios/App/App/Info.plist`:
  - `NSLocationWhenInUseUsageDescription`
  - `NSMotionUsageDescription`
  - `CFBundleLocalizations` (en, ja) + `CFBundleDevelopmentRegion`
- **Localized permission strings** — copy `native/ios/Base.lproj/InfoPlist.strings`
  and `native/ios/ja.lproj/InfoPlist.strings` into the app target, and enable
  Japanese under Project ▸ Info ▸ Localizations.
- **Privacy manifest** — copy `native/ios/PrivacyInfo.xcprivacy` into
  `ios/App/App/` and confirm it's in the App target's *Copy Bundle Resources*.

## 6. Xcode project settings

Open in Xcode:

```bash
npm run cap:ios          # cap open ios
```

- Signing & Capabilities → select your Team, automatic signing.
- General → **Version** `1.2.0`, **Build** `3`.
- Deployment target: iOS 14.0 or later (Capacitor 6 default is fine).
- Confirm Display Name shows correctly (朱雀 / Suzaku).

## 7. Archive & upload

- Product ▸ Destination ▸ *Any iOS Device (arm64)*.
- Product ▸ **Archive**.
- Organizer ▸ **Distribute App** ▸ App Store Connect ▸ Upload.

## 8. App Store Connect

Create the app record (bundle id `com.tatsuyaariyama.suzaku`) and fill in from
`store/app-store-listing.md`:

- [ ] Name, Subtitle, Promotional text, Description, Keywords (EN + JA)
- [ ] Primary category **Travel**, secondary **Navigation**
- [ ] Age rating **4+**
- [ ] **Privacy Policy URL** → `https://tatsuyaariyama.github.io/Ake/privacy.html`
- [ ] Support URL → GitHub repo
- [ ] App Privacy → **Data Not Collected** (see listing doc)
- [ ] Upload marketing icon `store/AppStore-marketing-icon-1024.png`
- [ ] Upload screenshots — 6.9" 必須。日本語は `store/screenshots/ja/`、
      英語は `store/screenshots/en/` を 01→05 の順で（各5枚・1320×2868）
- [ ] Select the uploaded build
- [ ] What's New = "First release. Welcome to Tokyo."
- [ ] Submit for Review

---

## Publish the privacy policy (GitHub Pages)

`public/privacy.html` ships in the Vite build, so `npm run build:pages`
(`--base=/Ake/`) outputs it to `dist/privacy.html`. Deploy `dist/` to GitHub
Pages and it will be live at:

```
https://tatsuyaariyama.github.io/Ake/privacy.html
```

## Pre-flight sanity

- [ ] `npm run build` passes (tsc + vite)
- [ ] Location & motion permission prompts appear on first tap
- [ ] Search returns POIs; nearby categories load
- [ ] Compass points correctly; arrival triggers near destination
- [ ] Language toggle (JA/EN) works in Onboarding and Settings
- [ ] Marketing icon is 1024×1024, **opaque** (no alpha)
