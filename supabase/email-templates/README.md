# BH Clothing emails (Supabase → Authentication → Emails)

Paste each file's whole content into the template's **Body** in Supabase, set the **Subject**, and save.
All of them use the BH logo from `https://bhclothing.fashion/email/bh-clothing-logo.png`.

| Supabase template | File | Subject |
|---|---|---|
| Confirm sign up | `confirm-signup.html` | Your BH Clothing code |
| Invite user | `invite.html` | You're invited to BH Clothing |
| Magic link or OTP | `magic-link.html` | Your BH Clothing sign-in code |
| Change email address | `change-email.html` | Confirm your new email for BH Clothing |
| Reset password | `reset-password.html` | Your BH Clothing password code |
| Reauthentication | `reauthentication.html` | Confirm it's you |
| Password changed (security notification) | `password-changed.html` | Your BH Clothing password was changed |

The sign-up and reset-password emails send a **code** (`{{ .Token }}`): the site asks for that code, not a link.
