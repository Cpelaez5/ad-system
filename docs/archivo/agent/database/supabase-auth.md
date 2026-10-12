---
id: 'auth'
title: 'Auth'
description: 'Use Supabase to Authenticate and Authorize your users.'
subtitle: 'Use Supabase to authenticate and authorize your users.'
tocVideo: '6ow_jW4epf8'
---

Supabase Auth makes it easy to implement authentication and authorization in your app. We provide client SDKs and API endpoints to help you create and manage users.

Your users can use many popular Auth methods, including password, magic link, one-time password (OTP), social login, and single sign-on (SSO).

## About authentication and authorization

Authentication and authorization are the core responsibilities of any Auth system.

- **Authentication** means checking that a user is who they say they are.
- **Authorization** means checking what resources a user is allowed to access.

Supabase Auth uses [JSON Web Tokens (JWTs)](/docs/guides/auth/jwts) for authentication. For a complete reference of all JWT fields, see the [JWT Fields Reference](/docs/guides/auth/jwt-fields). Auth integrates with Supabase's database features, making it easy to use [Row Level Security (RLS)](/docs/guides/database/postgres/row-level-security) for authorization.

## The Supabase ecosystem

You can use Supabase Auth as a standalone product, but it's also built to integrate with the Supabase ecosystem.

Auth uses your project's Postgres database under the hood, storing user data and other Auth information in a special schema. You can connect this data to your own tables using triggers and foreign key references.

Auth also enables access control to your database's automatically generated [REST API](/docs/guides/api). When using Supabase SDKs, your data requests are automatically sent with the user's Auth Token. The Auth Token scopes database access on a row-by-row level when used along with [RLS policies](/docs/guides/database/postgres/row-level-security).

<$Show if="authentication:show_providers">
<$Partial path="providers.mdx" />
</$Show>

<$Show if="billing:all">

## Pricing

Charges apply to Monthly Active Users (MAU), Monthly Active Third-Party Users (Third-Party MAU), and Monthly Active SSO Users (SSO MAU) and Advanced MFA Add-ons. For a detailed breakdown of how these charges are calculated, refer to the following pages:

- [Pricing MAU](/docs/guides/platform/manage-your-usage/monthly-active-users)
- [Pricing Third-Party MAU](/docs/guides/platform/manage-your-usage/monthly-active-users-third-party)
- [Pricing SSO MAU](/docs/guides/platform/manage-your-usage/monthly-active-users-sso)
- [Advanced MFA - Phone](/docs/guides/platform/manage-your-usage/advanced-mfa-phone)

</$Show>

---
title: 'Auth architecture'
subtitle: 'The architecture behind Supabase Auth.'
---

There are four major layers to Supabase Auth:

1. [Client layer.](#client-layer) This can be one of the Supabase client SDKs, or manually made HTTP requests using the HTTP client of your choice.
1. Kong API gateway. This is shared between all Supabase products.
1. [Auth service](#auth-service) (formerly known as GoTrue).
1. [Postgres database.](#postgres) This is shared between all Supabase products.

<Image
  alt="Diagram showing the architecture of Supabase. The Kong API gateway sits in front of 7 services: GoTrue, PostgREST, Realtime, Storage, pg_meta, Functions, and pg_graphql. All the services talk to a single Postgres instance."
  src={{
    dark: '/docs/img/supabase-architecture.svg',
    light: '/docs/img/supabase-architecture--light.svg',
  }}
/>

## Client layer

The client layer runs in your app. This could be running in many places, including:

- Your frontend browser code
- Your backend server code
- Your native application

The client layer provides the functions that you use to sign in and manage users. We recommend using the Supabase client SDKs, which handle:

- Configuration and authentication of HTTP calls to the Supabase Auth backend
- Persistence, refresh, and removal of Auth Tokens in your app's storage medium
- Integration with other Supabase products

But at its core, this layer manages the making of HTTP calls, so you could write your own client layer if you wanted to.

See the Client SDKs for more information:

- [JavaScript](/docs/reference/javascript/introduction)
- [Flutter](/docs/reference/dart/introduction)
- [Swift](/docs/reference/swift/introduction)
- [Python](/docs/reference/python/introduction)
- [C#](/docs/reference/csharp/introduction)
- [Kotlin](/docs/reference/kotlin/introduction)

## Auth service

The [Auth service](https://github.com/supabase/auth) is an Auth API server written and maintained by Supabase. It is a fork of the GoTrue project, originally created by Netlify.

When you deploy a new Supabase project, we deploy an instance of this server alongside your database, and inject your database with the required Auth schema.

The Auth service is responsible for:

- Validating, issuing, and refreshing JWTs
- Serving as the intermediary between your app and Auth information in the database
- Communicating with external providers for Social Login and SSO

## Postgres

Supabase Auth uses the `auth` schema in your Postgres database to store user tables and other information. For security, this schema is not exposed on the auto-generated API.

You can connect Auth information to your own objects using [database triggers](/docs/guides/database/postgres/triggers) and [foreign keys](https://www.postgresql.org/docs/current/tutorial-fk.html). Make sure that any views you create for Auth data are adequately protected by [enabling RLS](/docs/guides/database/postgres/row-level-security) or [revoking grants](https://www.postgresql.org/docs/current/sql-revoke.html).

<Admonition type="danger">

Make sure any views you create for Auth data are protected.

Starting in Postgres version 15, views inherit the RLS policies of the underlying tables if created with `security_invoker`. Views in earlier versions, or those created without `security_invoker`, inherit the permissions of the owner, who can bypass RLS policies.

</Admonition>

---
id: 'auth-google'
title: 'Login with Google'
description: 'Use Sign in with Google on the web, in native apps or with Chrome extensions'
---

Supabase Auth supports [Sign in with Google for the web](https://developers.google.com/identity/gsi/web/guides/overview), native applications ([Android](https://developer.android.com/identity/sign-in/credential-manager-siwg), [macOS and iOS](https://developers.google.com/identity/sign-in/ios/start-integrating)), and [Chrome extensions](https://cloud.google.com/identity-platform/docs/web/chrome-extension).

You can use Sign in with Google in two ways:

- [By writing application code](#application-code) for the web, native applications or Chrome extensions
- [By using Google's pre-built solutions](#google-pre-built) such as [personalized sign-in buttons](https://developers.google.com/identity/gsi/web/guides/personalized-button), [One Tap](https://developers.google.com/identity/gsi/web/guides/features) or [automatic sign-in](https://developers.google.com/identity/gsi/web/guides/automatic-sign-in-sign-out)

## Prerequisites

You need to do some setup to get started with Sign in with Google:

- Prepare a Google Cloud project. Go to the [Google Cloud Platform](https://console.cloud.google.com/home/dashboard) and create a new project if necessary.
- Use the [Google Auth Platform console](https://console.cloud.google.com/auth/overview) to register and set up your application's:
  - [**Audience**](https://console.cloud.google.com/auth/audience) by configuring which Google users are allowed to sign in to your application.
  - [**Data Access (Scopes)**](https://console.cloud.google.com/auth/scopes) define what your application can do with your user's Google data and APIs, such as access profile information or more.
  - [**Branding**](https://console.cloud.google.com/auth/branding) and [**Verification**](https://console.cloud.google.com/auth/verification) show a logo and name instead of the Supabase project ID in the consent screen, improving user retention. Brand verification may take a few business days.

### Setup required scopes

Supabase Auth needs a few scopes granting access to profile data of your end users, which you have to configure in the [**Data Access (Scopes)**](https://console.cloud.google.com/auth/scopes) screen:

- `openid` (add manually)
- `.../auth/userinfo.email` (added by default)
- `...auth/userinfo.profile` (added by default)

If you add more scopes, especially those on the sensitive or restricted list your application might be subject to verification which may take a long time.

### Setup consent screen branding

<Admonition type="note">

It's strongly recommended you set up a custom domain and optionally verify your brand information with Google, as this makes phishing attempts easier to spot by your users.

</Admonition>

Google's consent screen is shown to users when they sign in. Optionally configure one of the following to improve the appearance of the screen, increasing the perception of trust by your users:

1. Verify your application's brand (logo and name) by configuring it in the [Branding](https://console.cloud.google.com/auth/branding) section of the Google Auth Platform console. Brand verification is not automatic and may take a few business days.
1. Set up a [custom domain for your project](/docs/guides/platform/custom-domains) to present the user with a clear relationship to the website they clicked Sign in with Google on.
   - A good approach is to use `auth.example.com` or `api.example.com`, if your application is hosted on `example.com`.
   - If you don't set this up, users will see `<project-id>.supabase.co` which does not inspire trust and can make your application more susceptible to successful phishing attempts.

## Project setup

To support Sign In with Google, you need to configure the Google provider for your Supabase project.

<Tabs
  scrollable
  size="large"
  type="underlined"
  defaultActiveId="web"
  queryGroup="platform"
>
  <TabPanel id="web" label="Web">

Regardless of whether you use application code or Google's pre-built solutions to implement the sign in flow, you need to configure your project by obtaining a Client ID and Client Secret in the [Clients](https://console.cloud.google.com/auth/clients) section of the Google Auth Platform console:

1. [Create a new OAuth client ID](https://console.cloud.google.com/auth/clients/create) and choose **Web application** for the application type.
1. Under **Authorized JavaScript origins** add your application's URL. These should also be configured as the [Site URL or redirect configuration in your project](/docs/guides/auth/redirect-urls).
   - If your app is hosted on `https://example.com/app` add `https://example.com`.
   - Add `http://localhost:<port>` while developing locally. Remember to remove this when your application [goes into production](/docs/guides/deployment/going-into-prod).
1. Under **Authorized redirect URIs** add your Supabase project's callback URL.
   - Access it from the [Google provider page on the Dashboard](/dashboard/project/_/auth/providers?provider=Google).
   - For local development, use `http://127.0.0.1:54321/auth/v1/callback`.
1. Click `Create` and make sure you save the Client ID and Client Secret.
   - Add these values to the [Google provider page on the Dashboard](/dashboard/project/_/auth/providers?provider=Google).

  </TabPanel>

  <TabPanel id="react-native" label="Expo React Native">

1. [Create a new OAuth client ID](https://console.cloud.google.com/auth/clients/create) and choose **Android** or **iOS** depending on the OS you're building the app for.
   - For Android, use the instructions on screen to provide the SHA-1 certificate fingerprint used to sign your Android app.
   - You will have a different set of SHA-1 certificate fingerprints for testing locally and going to production. Make sure to add both to the Google Cloud Console, and add all of the Client IDs to the Supabase dashboard.
   - For iOS, use the instructions on screen to provide the app Bundle ID, and App Store ID and Team ID if the app is already published on the Apple App Store.
1. Register the Client ID in the [Google provider page on the Dashboard](/dashboard/project/_/auth/providers?provider=Google).

  </TabPanel>

  <TabPanel id="flutter-mobile" label="Flutter (iOS and Android)">

1. [Create a new OAuth client ID](https://console.cloud.google.com/auth/clients/create) and choose **Android** or **iOS** depending on the OS you're building the app for.
   - For Android, use the instructions on screen to provide the SHA-1 certificate fingerprint used to sign your Android app.
   - You will have a different set of SHA-1 certificate fingerprints for testing locally and going to production. Make sure to add both to the Google Cloud Console, and add all of the Client IDs to the Supabase dashboard.
   - For iOS, use the instructions on screen to provide the app Bundle ID, and App Store ID and Team ID if the app is already published on the Apple App Store.
1. Register the Client ID in the [Google provider page on the Dashboard](/dashboard/project/_/auth/providers?provider=Google).
   - For iOS enable the `Skip nonce check` option.

For iOS add a `CFBundleURLTypes` key in the `<project>/ios/Runner/Info.plist` file:

```xml
<!-- Put me in the [my_project]/ios/Runner/Info.plist file -->
<!-- Google Sign-in Section -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <!-- TODO Replace this value: -->
      <!-- Copied from GoogleService-Info.plist key REVERSED_CLIENT_ID -->
      <string>com.googleusercontent.apps.861823949799-vc35cprkp249096uujjn0vvnmcvjppkn</string>
    </array>
  </dict>
</array>
<!-- End of the Google Sign-in Section -->
```

</TabPanel>

<TabPanel id="flutter-other" label="Flutter (web, macOS, Windows, Linux)">

Follow the same configuration guide as if your app was a Web application when building a desktop Flutter application.

</TabPanel>

<$Show if="sdk:swift">

  <TabPanel id="swift" label="Swift">

    Google sign-in with Supabase is done through the [`GoogleSignIn-iOS`](https://github.com/google/GoogleSignIn-iOS) package.

    When the user provides consent, Google issues an identity token (commonly abbreviated as ID token) that is then sent to your project's Supabase Auth server. When valid, a new user session is started by issuing an access and refresh token from Supabase Auth.

    Follow the code sample below to implement native Google sign-in with Supabase in your iOS app.

    ```swift
    import GoogleSignIn

    class GoogleSignInViewController: UIViewController {
      ...

      func googleSignIn() async throws {
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: self)

        guard let idToken = result.user.idToken?.tokenString else {
          print("No idToken found.")
          return
        }

        let accessToken = result.user.accessToken.tokenString

        try await supabase.auth.signInWithIdToken(
          credentials: OpenIDConnectCredentials(
            provider: .google,
            idToken: idToken,
            accessToken: accessToken
          )
        )
      }
      ...

    }
    ```

    ### Configuration [#ios-configuration]

    1. Follow the integration instructions on the [get started with Google Sign-In](https://developers.google.com/identity/sign-in/ios/start-integrating) for the iOS guide.
    2. Configure the [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent). This information is shown to the user when giving consent to your app. In particular, make sure you have set up links to your app's privacy policy and terms of service.
    3. Add web client ID and iOS client ID from step 1 in the [Google provider on the Supabase Dashboard](/dashboard/project/_/auth/providers), under _Client IDs_, separated by a comma. Enable the `Skip nonce check` option.

  </TabPanel>
  </$Show>

  <TabPanel id="android" label="Android (Kotlin)">

1. [Create a new OAuth client ID](https://console.cloud.google.com/auth/clients/create) and choose **Android** or **iOS** if also building an iOS app with Kotlin Multiplatform.
   - For Android, use the instructions on screen to provide the SHA-1 certificate fingerprint used to sign your Android app.
   - You will have a different set of SHA-1 certificate fingerprints for testing locally and going to production. Make sure to add both to the Google Cloud Console, and add all of the Client IDs to the Supabase dashboard.
   - For iOS (with Kotlin Multiplatform), use the instructions on screen to provide the app Bundle ID, and App Store ID and Team ID if the app is already published on the Apple App Store.
1. Register the Client ID in the [Google provider page on the Dashboard](/dashboard/project/_/auth/providers?provider=Google).

  </TabPanel>

  <TabPanel id="chrome-extensions" label="Chrome Extensions">

1. [Create a new OAuth client ID](https://console.cloud.google.com/auth/clients/create) and choose **Chrome Extension** for application type.
   - Enter your extension's Item ID and optionally verify app ownership.
1. Register the Client ID in the [Google provider page on the Dashboard](/dashboard/project/_/auth/providers?provider=Google) under _Client IDs_.

  </TabPanel>
</Tabs>

### Local development

To use the Google provider in local development:

1. Add a new environment variable:
   ```env
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET="<client-secret>"
   ```
2. Configure the provider in `supabase/config.toml`:
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "<client-id>"
   secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
   skip_nonce_check = false
   ```

If you have multiple client IDs, such as one for Web, iOS and Android, concatenate all of the client IDs with a comma but make sure the web's client ID is first in the list.

### Using the management API

Use the [PATCH `/v1/projects/{ref}/config/auth` Management API endpoint](/docs/reference/api/v1-update-auth-service-config) to configure the project's Auth settings programmatically. For configuring the Google provider send these options:

```json
{
  "external_google_enabled": true,
  "external_google_client_id": "your-google-client-id",
  "external_google_secret": "your-google-client-secret"
}
```

## Signing users in

<Tabs
  scrollable
  size="large"
  type="underlined"
  defaultActiveId="web"
  queryGroup="platform"
>
<TabPanel id="web" label="Web">

### Application code

To use your own application code for the signin button, call the `signInWithOAuth` method (or the equivalent for your language).

<$Partial path="create_client_snippet.mdx" />

```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient('url', 'anonKey')

// ---cut---
supabase.auth.signInWithOAuth({
  provider: 'google',
})
```

For an implicit flow, that's all you need to do. The user will be taken to Google's consent screen, and finally redirected to your app with an access and refresh token pair representing their session.

<$Partial path="oauth_pkce_flow.mdx" />

After a successful code exchange, the user's session will be saved to cookies.

### Saving Google tokens

The tokens saved by your application are the Supabase Auth tokens. Your app might additionally need the Google OAuth 2.0 tokens to access Google services on the user's behalf.

On initial login, you can extract the `provider_token` from the session and store it in a secure storage medium. The session is available in the returned data from `signInWithOAuth` (implicit flow) and `exchangeCodeForSession` (PKCE flow).

Google does not send out a refresh token by default, so you will need to pass parameters like these to `signInWithOAuth()` in order to extract the `provider_refresh_token`:

```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://your-project.supabase.co', 'sb_publishable_... or anon key')

// ---cut---
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
})
```

### Google pre-built [#google-pre-built]

Most web apps and websites can utilize Google's [personalized sign-in buttons](https://developers.google.com/identity/gsi/web/guides/personalized-button), [One Tap](https://developers.google.com/identity/gsi/web/guides/features) or [automatic sign-in](https://developers.google.com/identity/gsi/web/guides/automatic-sign-in-sign-out) for the best user experience.

1. Load the Google client library in your app by including the third-party script:

   ```html
   <script src="https://accounts.google.com/gsi/client" async></script>
   ```

1. Use the [HTML Code Generator](https://developers.google.com/identity/gsi/web/tools/configurator) to customize the look, feel, features and behavior of the Sign in with Google button.
1. Pick the _Swap to JavaScript callback_ option, and input the name of your callback function. This function will receive a [`CredentialResponse`](https://developers.google.com/identity/gsi/web/reference/js-reference#CredentialResponse) when sign in completes.

   To make your app compatible with Chrome's third-party-cookie phase-out, make sure to set `data-use_fedcm_for_prompt` to `true`.

   Your final HTML code might look something like this:

   ```html
   <div
     id="g_id_onload"
     data-client_id="<client ID>"
     data-context="signin"
     data-ux_mode="popup"
     data-callback="handleSignInWithGoogle"
     data-nonce=""
     data-auto_select="true"
     data-itp_support="true"
     data-use_fedcm_for_prompt="true"
   ></div>

   <div
     class="g_id_signin"
     data-type="standard"
     data-shape="pill"
     data-theme="outline"
     data-text="signin_with"
     data-size="large"
     data-logo_alignment="left"
   ></div>
   ```

1. Create a `handleSignInWithGoogle` function that takes the `CredentialResponse` and passes the included token to Supabase. The function needs to be available in the global scope for Google's code to find it.

   ```ts
   async function handleSignInWithGoogle(response) {
     const { data, error } = await supabase.auth.signInWithIdToken({
       provider: 'google',
       token: response.credential,
     })
   }
   ```

1. _(Optional)_ Configure a nonce. The use of a nonce is recommended for extra security, but optional. The nonce should be generated randomly each time, and it must be provided in both the `data-nonce` attribute of the HTML code and the options of the callback function.

   ```ts
   async function handleSignInWithGoogle(response) {
     const { data, error } = await supabase.auth.signInWithIdToken({
       provider: 'google',
       token: response.credential,
       nonce: '<NONCE>',
     })
   }
   ```

   Note that the nonce should be the same in both places, but because Supabase Auth expects the provider to hash it (SHA-256, hexadecimal representation), you need to provide a hashed version to Google and a non-hashed version to `signInWithIdToken`.

   You can get both versions by using the in-built `crypto` library:

   ```js
   // Adapted from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string

   const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
   const encoder = new TextEncoder()
   const encodedNonce = encoder.encode(nonce)
   crypto.subtle.digest('SHA-256', encodedNonce).then((hashBuffer) => {
     const hashArray = Array.from(new Uint8Array(hashBuffer))
     const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
   })

   // Use 'hashedNonce' when making the authentication request to Google
   // Use 'nonce' when invoking the supabase.auth.signInWithIdToken() method
   ```

### One-tap with Next.js

If you're integrating Google One-Tap with your Next.js application, you can refer to the example below to get started:

```tsx
'use client'

import Script from 'next/script'
import { createClient } from '@/utils/supabase/client'
import type { accounts, CredentialResponse } from 'google-one-tap'
import { useRouter } from 'next/navigation'

declare const google: { accounts: accounts }

// generate nonce to use for google id token sign-in
const generateNonce = async (): Promise<string[]> => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const encoder = new TextEncoder()
  const encodedNonce = encoder.encode(nonce)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return [nonce, hashedNonce]
}

const OneTapComponent = () => {
  const supabase = createClient()
  const router = useRouter()

  const initializeGoogleOneTap = async () => {
    console.log('Initializing Google One Tap')
    const [nonce, hashedNonce] = await generateNonce()
    console.log('Nonce: ', nonce, hashedNonce)

    // check if there's already an existing session before initializing the one-tap UI
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session', error)
    }
    if (data.session) {
      router.push('/')
      return
    }

    /* global google */
    google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: async (response: CredentialResponse) => {
        try {
          // send id token returned in response.credential to supabase
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
            nonce,
          })

          if (error) throw error
          console.log('Session data: ', data)
          console.log('Successfully logged in with Google One Tap')

          // redirect to protected page
          router.push('/')
        } catch (error) {
          console.error('Error logging in with Google One Tap', error)
        }
      },
      nonce: hashedNonce,
      // with chrome's removal of third-party cookies, we need to use FedCM instead (https://developers.google.com/identity/gsi/web/guides/fedcm-migration)
      use_fedcm_for_prompt: true,
    })
    google.accounts.id.prompt() // Display the One Tap UI
  }

  return <Script onReady={initializeGoogleOneTap} src="https://accounts.google.com/gsi/client" />
}

export default OneTapComponent
```

</TabPanel>

<TabPanel id="react-native" label="Expo React Native">

Unlike the OAuth flow which requires the use of a web browser, the native Sign in with Google flow on Android uses the [Credential Manager library](https://developer.android.com/identity/sign-in/credential-manager-siwg) to prompt the user for consent.

When the user provides consent, Google issues an identity token (commonly abbreviated as ID token) that you then send to your project's Supabase Auth server. When valid, a new user session is started by issuing an access and refresh token from Supabase Auth.

By default, Supabase Auth implements nonce validation during the authentication flow. This can be disabled in production under `Authentication > Providers > Google > Skip Nonce Check` in the Dashboard, or when developing locally by setting `auth.external.<provider>.skip_nonce_check`. Only disable this if your client libraries cannot properly handle nonce verification.

When working with Expo, you can use the [`@react-native-google-signin/google-signin` library](https://github.com/react-native-google-signin/google-signin#expo-installation) to obtain an ID token that you can pass to supabase-js [`signInWithIdToken` method](/docs/reference/javascript/auth-signinwithidtoken).

Follow the [Expo installation docs](https://react-native-google-signin.github.io/docs/setting-up/expo) for installation and configuration instructions. See the [supabase-js reference](/docs/reference/javascript/initializing?example=react-native-options-async-storage) for instructions on initializing the supabase-js client in React Native.

```tsx ./components/Auth.native.tsx
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { supabase } from '../utils/supabase'

export default function () {
  GoogleSignin.configure({
    webClientId: 'YOUR CLIENT ID FROM GOOGLE CONSOLE',
  })

  return (
    <GoogleSigninButton
      size={GoogleSigninButton.Size.Wide}
      color={GoogleSigninButton.Color.Dark}
      onPress={async () => {
        try {
          await GoogleSignin.hasPlayServices()
          const response = await GoogleSignin.signIn()
          if (isSuccessResponse(response)) {
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.data.idToken,
            })
            console.log(error, data)
          }
        } catch (error: any) {
          if (error.code === statusCodes.IN_PROGRESS) {
            // operation (e.g. sign in) is in progress already
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            // play services not available or outdated
          } else {
            // some other error happened
          }
        }
      }}
    />
  )
}
```

</TabPanel>

<TabPanel id="flutter-mobile" label="Flutter (iOS and Android)">

Google sign-in with Supabase is done through the [google_sign_in](https://pub.dev/packages/google_sign_in) package for iOS and Android.

When the user provides consent, Google issues an identity token (commonly abbreviated as ID token) that is then sent to your project's Supabase Auth server. When valid, a new user session is started by issuing an access and refresh token from Supabase Auth.

Follow the code sample below to implement native Google sign-in with Supabase in your Flutter iOS and Android app.

```dart
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

...
Future<void> _nativeGoogleSignIn() async {
  /// TODO: update the Web client ID with your own.
  ///
  /// Web Client ID that you registered with Google Cloud.
  const webClientId = 'my-web.apps.googleusercontent.com';

  /// TODO: update the iOS client ID with your own.
  ///
  /// iOS Client ID that you registered with Google Cloud.
  const iosClientId = 'my-ios.apps.googleusercontent.com';

  final scopes = ['email', 'profile'];
  final googleSignIn = GoogleSignIn.instance;

  await googleSignIn.initialize(
    serverClientId: webClientId,
    clientId: iosClientId,
  );

  final googleUser = await googleSignIn.attemptLightweightAuthentication();
  // or await googleSignIn.authenticate(); which will return a GoogleSignInAccount or throw an exception

  if (googleUser == null) {
    throw AuthException('Failed to sign in with Google.');
  }

  /// Authorization is required to obtain the access token with the appropriate scopes for Supabase authentication,
  /// while also granting permission to access user information.
  final authorization =
      await googleUser.authorizationClient.authorizationForScopes(scopes) ??
      await googleUser.authorizationClient.authorizeScopes(scopes);

  final idToken = googleUser.authentication.idToken;

  if (idToken == null) {
    throw AuthException('No ID Token found.');
  }

  await supabase.auth.signInWithIdToken(
    provider: OAuthProvider.google,
    idToken: idToken,
    accessToken: authorization.accessToken,
  );
}
...
```

<div className="video-container">
  <iframe
    src="https://www.youtube-nocookie.com/embed/utMg6fVmX0U"
    frameBorder="1"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  ></iframe>
</div>

</TabPanel>

<TabPanel id="flutter-other" label="Flutter (web, macOS, Windows, Linux)">

Google sign-in with Supabase on Web, macOS, Windows, and Linux is done through the [`signInWithOAuth`](/docs/reference/dart/auth-signinwithoauth) method.

This method of signing in is web based, and will open a browser window to perform the sign in. For non-web platforms, the user is brought back to the app via [deep linking](/docs/guides/auth/native-mobile-deep-linking?platform=flutter).

```dart
await supabase.auth.signInWithOAuth(
  OAuthProvider.google,
  redirectTo: kIsWeb ? null : 'my.scheme://my-host', // Optionally set the redirect link to bring back the user via deeplink.
  authScreenLaunchMode:
      kIsWeb ? LaunchMode.platformDefault : LaunchMode.externalApplication, // Launch the auth screen in a new webview on mobile.
);
```

This call takes the user to Google's consent screen. Once the flow ends, the user's profile information is exchanged and validated with Supabase Auth before it redirects back to your Flutter application with an access and refresh token representing the user's session.

<div className="video-container">
  <iframe
    src="https://www.youtube-nocookie.com/embed/utMg6fVmX0U"
    frameBorder="1"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  ></iframe>
</div>

</TabPanel>

<TabPanel id="android" label="Android (Kotlin)">

### Using Google sign-in on Android

The Sign in with Google flow on Android uses the [operating system's built-in functionalities](https://developer.android.com/training/sign-in/credential-manager) to prompt the user for consent.

When the user provides consent, Google issues an identity token (commonly abbreviated as ID token) that is then sent to your project's Supabase Auth server. When valid, a new user session is started by issuing an access and refresh token from Supabase Auth.

**Note:** You have to create OAuth client IDs for both a Web and Android application. The Web client ID is the one used in your Android app.

Add the following dependencies to your app. You can find the latest version of `credentials` [here](https://developer.android.com/jetpack/androidx/releases/credentials) and `googleid` [here](https://developers.google.com/identity/android-credential-manager/releases).

```kotlin
implementation("androidx.credentials:credentials:<latest version>")
implementation ("com.google.android.libraries.identity.googleid:googleid:<latest version>")

// optional - needed for credentials support from play services, for devices running
// Android 13 and below.
implementation("androidx.credentials:credentials-play-services-auth:<latest version>")
```

Add the following ProGuard rules to your `proguard-rules.pro` file:

```proguard
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** {
  *;
}
```

Follow the code sample below to implement native Google sign-in with Supabase using Credential Manager in your Android app.

```kotlin
@Composable
fun GoogleSignInButton() {
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current

    val onClick: () -> Unit = {
        val credentialManager = CredentialManager.create(context)

        // Generate a nonce and hash it with sha-256
        // Providing a nonce is optional but recommended
        val rawNonce = UUID.randomUUID().toString() // Generate a random String. UUID should be sufficient, but can also be any other random string.
        val bytes = rawNonce.toString().toByteArray()
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(bytes)
        val hashedNonce = digest.fold("") { str, it -> str + "%02x".format(it) } // Hashed nonce to be passed to Google sign-in


        val googleIdOption: GetGoogleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId("WEB_GOOGLE_CLIENT_ID")
            .setNonce(hashedNonce) // Provide the nonce if you have one
            .build()

        val request: GetCredentialRequest = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        coroutineScope.launch {
            try {
                val result = credentialManager.getCredential(
                    request = request,
                    context = context,
                )

                val googleIdTokenCredential = GoogleIdTokenCredential
                    .createFrom(result.credential.data)

                val googleIdToken = googleIdTokenCredential.idToken

                supabase.auth.signInWith(IDToken) {
                    idToken = googleIdToken
                    provider = Google
                    nonce = rawNonce
                }

                // Handle successful sign-in
            } catch (e: GetCredentialException) {
                // Handle GetCredentialException thrown by `credentialManager.getCredential()`
            } catch (e: GoogleIdTokenParsingException) {
                // Handle GoogleIdTokenParsingException thrown by `GoogleIdTokenCredential.createFrom()`
            } catch (e: RestException) {
                // Handle RestException thrown by Supabase
            } catch (e: Exception) {
                // Handle unknown exceptions
            }
        }
    }

    Button(
        onClick = onClick,
    ) {
        Text("Sign in with Google")
    }
}
```

### Using Google sign-in with Kotlin Multiplatform

When using [Compose Multiplatform](https://www.jetbrains.com/lp/compose-multiplatform/), you can use the [compose-auth](/docs/reference/kotlin/installing) plugin. On Android it uses the Credential Manager automatically and on other platforms it uses `auth.signInWith(Google)`.

**Initialize the Supabase Client**

**Note:** You have to create OAuth credentials for both a Web and Android application. [Learn more](https://developer.android.com/identity/legacy/one-tap/legacy-get-started)

```kotlin
val supabaseClient = createSupabaseClient(
    supabaseUrl = "SUPABASE_URL",
    supabaseKey = "SUPABASE_KEY"
) {
    install(Auth)
    install(ComposeAuth) {
        googleNativeLogin("WEB_GOOGLE_CLIENT_ID") //Use the Web Client ID, not the Android one!
    }
}
```

**Use the Compose Auth plugin in your Auth Screen**

```kotlin
val authState = supabaseClient.composeAuth.rememberSignInWithGoogle(
    onResult = {
        when(it) { //handle errors
            NativeSignInResult.ClosedByUser -> TODO()
            is NativeSignInResult.Error -> TODO()
            is NativeSignInResult.NetworkError -> TODO()
            NativeSignInResult.Success -> TODO()
        }
    }
)

Button(onClick = { authState.startFlow() }) {
    Text("Sign in with Google")
}
```

<div className="video-container">
  <iframe
    src="https://www.youtube-nocookie.com/embed/P_jZMDmodG4"
    frameBorder="1"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  ></iframe>
</div>

</TabPanel>

<TabPanel id="chrome-extensions" label="Chrome Extensions">

### Using native sign in for Chrome extensions

Similar to the native sign in for Android, you can use the Chrome browser's [identity APIs](https://developer.chrome.com/docs/extensions/reference/identity/) to launch an authentication flow.

First, you need to configure your `manifest.json` file like so:

```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "<client ID>",
    "scopes": ["openid", "email", "profile"]
  }
}
```

Then you should call the [`chrome.identity.launchWebAuthFlow()`](https://developer.chrome.com/docs/extensions/reference/identity/#method-launchWebAuthFlow) function to trigger the sign in flow. On success, call the `supabase.auth.signInWithIdToken()` function to complete sign in with your Supabase project.

```ts
const manifest = chrome.runtime.getManifest()

const url = new URL('https://accounts.google.com/o/oauth2/auth')

url.searchParams.set('client_id', manifest.oauth2.client_id)
url.searchParams.set('response_type', 'id_token')
url.searchParams.set('access_type', 'offline')
url.searchParams.set('redirect_uri', `https://${chrome.runtime.id}.chromiumapp.org`)
url.searchParams.set('scope', manifest.oauth2.scopes.join(' '))

chrome.identity.launchWebAuthFlow(
  {
    url: url.href,
    interactive: true,
  },
  async (redirectedTo) => {
    if (chrome.runtime.lastError) {
      // auth was not successful
    } else {
      // auth was successful, extract the ID token from the redirectedTo URL
      const url = new URL(redirectedTo)
      const params = new URLSearchParams(url.hash)

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: params.get('id_token'),
      })
    }
  }
)
```

</TabPanel>
</Tabs>

---
id: 'auth-mfa'
title: 'Multi-Factor Authentication'
description: 'Add an additional layer of security to your apps with Supabase Auth multi-factor authentication.'
---

Multi-factor authentication (MFA), sometimes called two-factor authentication (2FA), adds an additional layer of security to your application by verifying their identity through additional verification steps.

It is considered a best practice to use MFA for your applications.

Users with weak passwords or compromised social login accounts are prone to malicious account takeovers. These can be prevented with MFA because they require the user to provide proof of both of these:

- Something they know.
  Password, or access to a social-login account.
- Something they have.
  Access to an authenticator app (a.k.a. TOTP) or a mobile phone.

## Overview

Supabase Auth implements MFA via two methods: App Authenticator, which makes use of a Time based-one Time Password, and phone messaging, which makes use of a code generated by Supabase Auth.

Applications using MFA require two important flows:

1. **Enrollment flow.**
   This lets users set up and control MFA in your app.
2. **Authentication flow.**
   This lets users sign in using any factors after the conventional login step.

Supabase Auth provides:

- **Enrollment API** - build rich user interfaces for adding and removing factors.
- **Challenge and Verify APIs** - securely verify that the user has access to a factor.
- **List Factors API** - build rich user interfaces for signing in with additional factors.

You can control access to the Enrollment API as well as the Challenge and Verify APIs via the Supabase Dashboard. A setting of `Verification Disabled` will disable both the challenge API and the verification API.

These sets of APIs let you control the MFA experience that works for you. You can create flows where MFA is optional, mandatory for all, or only specific groups of users.

Once users have enrolled or signed-in with a factor, Supabase Auth adds additional metadata to the user's access token (JWT) that your application can use to allow or deny access.

This information is represented by an [Authenticator Assurance Level](https://pages.nist.gov/800-63-3-Implementation-Resources/63B/AAL/), a standard measure about the assurance of the user's identity Supabase Auth has for that particular session. There are two levels recognized today:

1. **Assurance Level 1: `aal1`**
   Means that the user's identity was verified using a conventional login method
   such as email+password, magic link, one-time password, phone auth or social
   login.
2. **Assurance Level 2: `aal2`**
   Means that the user's identity was additionally verified using at least one
   second factor, such as a TOTP code or One-Time Password code.

This assurance level is encoded in the `aal` claim in the JWT associated with the user. By decoding this value you can create custom authorization rules in your frontend, backend, and database that will enforce the MFA policy that works for your application. JWTs without an `aal` claim are at the `aal1` level.

## Adding to your app

Adding MFA to your app involves these four steps:

1. **Add enrollment flow.**
   You need to provide a UI within your app that your users will be able to set-up
   MFA in. You can add this right after sign-up, or as part of a separate flow in
   the settings portion of your app.
2. **Add unenroll flow.**
   You need to support a UI through which users can see existing devices and unenroll
   devices which are no longer relevant.
3. **Add challenge step to login.**
   If a user has set-up MFA, your app's login flow needs to present a challenge
   screen to the user asking them to prove they have access to the additional
   factor.
4. **Enforce rules for MFA logins.**
   Once your users have a way to enroll and log in with MFA, you need to enforce
   authorization rules across your app: on the frontend, backend, API servers or
   Row-Level Security policies.

The enrollment flow and the challenge steps differ by factor and are covered on a separate page. Visit the [Phone](/docs/guides/auth/auth-mfa/phone) or [App Authenticator](/docs/guides/auth/auth-mfa/totp) pages to see how to add the flows for the respective factors. You can combine both flows and allow for use of both Phone and App Authenticator Factors.

### Add unenroll flow

The unenroll process is the same for both Phone and TOTP factors.

An unenroll flow provides a UI for users to manage and unenroll factors linked to their accounts. Most applications do so via a factor management page where users can view and unlink selected factors.

When a user unenrolls a factor, call `supabase.auth.mfa.unenroll()` with the ID of the factor. For example, call:

```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://your-project-id.supabase.co',
  'sb_publishable_... or anon key'
)

// ---cut---
supabase.auth.mfa.unenroll({ factorId: 'd30fd651-184e-4748-a928-0a4b9be1d429' })
```

to unenroll a factor with ID `d30fd651-184e-4748-a928-0a4b9be1d429`.

### Enforce rules for MFA logins

Adding MFA to your app's UI does not in-and-of-itself offer a higher level of security to your users. You also need to enforce the MFA rules in your application's database, APIs, and server-side rendering.

Depending on your application's needs, there are three ways you can choose to enforce MFA.

1. **Enforce for all users (new and existing).**
   Any user account will have to enroll MFA to continue using your app.
   The application will not allow access without going through MFA first.
2. **Enforce for new users only.**
   Only new users will be forced to enroll MFA, while old users will be encouraged
   to do so.
   The application will not allow access for new users without going through MFA
   first.
3. **Enforce only for users that have opted-in.**
   Users that want MFA can enroll in it and the application will not allow access
   without going through MFA first.

#### Example: React

Below is an example that creates a new `UnenrollMFA` component that illustrates the important pieces of the MFA enrollment flow. Note that users can only unenroll a factor after completing the enrollment flow and obtaining an `aal2` JWT claim. Here are some points of note:

- When the component appears on screen, the `supabase.auth.mfa.listFactors()` endpoint
  fetches all existing factors together with their details.
- The existing factors for a user are displayed in a table.
- Once the user has selected a factor to unenroll, they can type in the `factorId` and click **Unenroll**
  which creates a confirmation modal.

<Admonition type="note">

Unenrolling a factor will downgrade the assurance level from `aal2` to `aal1` only after the refresh interval has lapsed. For an immediate downgrade from `aal2` to `aal1` after enrolling one will need to manually call `refreshSession()`

</Admonition>

```tsx
/**
 * UnenrollMFA shows a simple table with the list of factors together with a button to unenroll.
 * When a user types in the factorId of the factor that they wish to unenroll and clicks unenroll
 * the corresponding factor will be unenrolled.
 */
export function UnenrollMFA() {
  const [factorId, setFactorId] = useState('')
  const [factors, setFactors] = useState([])
  const [error, setError] = useState('') // holds an error message

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) {
        throw error
      }

      setFactors([...data.totp, ...data.phone])
    })()
  }, [])

  return (
    <>
      {error && <div className="error">{error}</div>}
      <tbody>
        <tr>
          <td>Factor ID</td>
          <td>Friendly Name</td>
          <td>Factor Status</td>
          <td>Phone Number</td>
        </tr>
        {factors.map((factor) => (
          <tr>
            <td>{factor.id}</td>
            <td>{factor.friendly_name}</td>
            <td>{factor.factor_type}</td>
            <td>{factor.status}</td>
            <td>{factor.phone}</td>
          </tr>
        ))}
      </tbody>
      <input type="text" value={verifyCode} onChange={(e) => setFactorId(e.target.value.trim())} />
      <button onClick={() => supabase.auth.mfa.unenroll({ factorId })}>Unenroll</button>
    </>
  )
}
```

#### Database

Your app should sufficiently deny or allow access to tables or rows based on the user's current and possible authenticator levels.

<Admonition type="caution">

Postgres has two types of policies: permissive and restrictive. This guide uses restrictive policies. Make sure you don't omit the `as restrictive` clause.

</Admonition>

##### Enforce for all users (new and existing)

If your app falls under this case, this is a template Row Level Security policy you can apply to all your tables:

```sql
create policy "Policy name."
  on table_name
  as restrictive
  to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2');
```

- Here the policy will not accept any JWTs with an `aal` claim other than
  `aal2`, which is the highest authenticator assurance level.
- **Using `as restrictive` ensures this policy will restrict all commands on the
  table regardless of other policies!**

##### Enforce for new users only

If your app falls under this case, the rules get more complex. User accounts created past a certain timestamp must have a `aal2` level to access the database.

```sql
create policy "Policy name."
  on table_name
  as restrictive -- very important!
  to authenticated
  using
    (array[(select auth.jwt()->>'aal')] <@ (
       select
         case
           when created_at >= '2022-12-12T00:00:00Z' then array['aal2']
           else array['aal1', 'aal2']
         end as aal
       from auth.users
       where (select auth.uid()) = id));
```

- The policy will accept both `aal1` and `aal2` for users with a `created_at`
  timestamp prior to 12th December 2022 at 00:00 UTC, but will only accept
  `aal2` for all other timestamps.
- The `<@` operator is PostgreSQL's ["contained in"
  operator.](https://www.postgresql.org/docs/current/functions-array.html)
- **Using `as restrictive` ensures this policy will restrict all commands on the
  table regardless of other policies!**

##### Enforce only for users that have opted-in

Users that have enrolled MFA on their account are expecting that your
application only works for them if they've gone through MFA.

```sql
create policy "Policy name."
  on table_name
  as restrictive -- very important!
  to authenticated
  using (
    array[(select auth.jwt()->>'aal')] <@ (
      select
          case
            when count(id) > 0 then array['aal2']
            else array['aal1', 'aal2']
          end as aal
        from auth.mfa_factors
        where ((select auth.uid()) = user_id) and status = 'verified'
    ));
```

- The policy will only accept only `aal2` when the user has at least one MFA
  factor verified.
- Otherwise, it will accept both `aal1` and `aal2`.
- The `<@` operator is PostgreSQL's ["contained in"
  operator.](https://www.postgresql.org/docs/current/functions-array.html)
- **Using `as restrictive` ensures this policy will restrict all commands on the
  table regardless of other policies!**

### Server-Side Rendering

<Admonition type="tip">

When using the Supabase JavaScript library in a server-side rendering context, make sure you always create a new object for each request! This will prevent you from accidentally rendering and serving content belonging to different users.

</Admonition>

It is possible to enforce MFA on the Server-Side Rendering level. However, this can be tricky do to well.

You can use the `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` and `supabase.auth.mfa.listFactors()` APIs to identify the AAL level of the session and any factors that are enabled for a user, similar to how you would use these on the browser.

However, encountering a different AAL level on the server may not actually be a security problem. Consider these likely scenarios:

1. User signed-in with a conventional method but closed their tab on the MFA
   flow.
2. User forgot a tab open for a very long time. (This happens more often than
   you might imagine.)
3. User has lost their authenticator device and is confused about the next
   steps.

We thus recommend you redirect users to a page where they can authenticate using their additional factor, instead of rendering a HTTP 401 Unauthorized or HTTP 403 Forbidden content.

### APIs

If your application uses the Supabase Database, Storage or Edge Functions, just using Row Level Security policies will give you sufficient protection. In the event that you have other APIs that you wish to protect, follow these general guidelines:

1. **Use a good JWT verification and parsing library for your language.**
   This will let you securely parse JWTs and extract their claims.
2. **Retrieve the `aal` claim from the JWT and compare its value according to
   your needs.**
   If you've encountered an AAL level that can be increased, ask the user to
   continue the login process instead of logging them out.
3. **Use the `https://<project-ref>.supabase.co/rest/v1/auth/factors` REST
   endpoint to identify if the user has enrolled any MFA factors.**
   Only `verified` factors should be acted upon.

## Frequently asked questions

<Accordion
  type="default"
  openBehaviour="multiple"
  chevronAlign="right"
  justified
  size="medium"
  className="text-foreground-light mt-8 mb-6 [&>div]:space-y-4"
>

<AccordionItem
header={<span className="text-foreground">How do I check when a user went through MFA?</span>}
id="how-do-i-check-when-a-user-went-through-mfa"
>

Access tokens issued by Supabase Auth contain an `amr` (Authentication Methods Reference) claim. It is an array of objects that indicate what authentication methods the user has used so far.

For example, the following structure describes a user that first signed in with a password-based method, and then went through TOTP MFA 2 minutes and 12 seconds later. The entries are ordered most recent method first!

```json
{
  "amr": [
    {
      "method": "totp",
      "timestamp": 1666086056
    },
    {
      "method": "password",
      "timestamp": 1666085924
    }
  ]
}
```

Use the `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` method to get easy access to this information in your browser app.

You can use this Postgres snippet in RLS policies, too:

```sql
jsonb_path_query((select auth.jwt()), '$.amr[0]')
```

- [`jsonb_path_query(json, path)`](https://www.postgresql.org/docs/current/functions-json.html#FUNCTIONS-JSON-PROCESSING-TABLE)
  is a function that allows access to elements in a JSON object according to a
  [SQL/JSON
  path](https://www.postgresql.org/docs/current/functions-json.html#FUNCTIONS-SQLJSON-PATH).
- `$.amr[0]` is a SQL/JSON path expression that fetches the most recent
  authentication method in the JWT.

Once you have extracted the most recent entry in the array, you can compare the `method` and `timestamp` to enforce stricter rules. For instance, you can mandate that access will be only be granted on a table to users who have recently signed in with a password.

Currently recognized authentication methods are:

- `oauth` - any OAuth based sign in (social login).
- `password` - any password based sign in.
- `otp` - any one-time password based sign in (email code, SMS code, magic
  link).
- `totp` - a TOTP additional factor.
- `sso/saml` - any Single Sign On (SAML) method.
- `anonymous` - any anonymous sign in.

The following additional claims are available when using PKCE flow:

- `invite` - any sign in via an invitation.
- `magiclink` - any sign in via magic link. Excludes logins resulting from invocation of `signUp`.
- `email/signup` - any login resulting from an email signup.
- `email_change` - any login resulting from a change in email.

More authentication methods will be added over time as we increase the number of authentication methods supported by Supabase.

</AccordionItem>

</Accordion>