# Telegram from scratch

You do not need to know Telegram for any of this. Five things, in order. The
first three are on your phone, the fourth is one command here, the fifth is two
clicks in the copilot.

---

## 1. Get Telegram on your phone

App Store, search **Telegram**, install the one by Telegram FZ-LLC (blue circle,
white paper plane). Open it, tap **Start Messaging**, enter your phone number,
type in the code it texts you, and give it a first name. That is the whole
signup: no password, no email.

If you would rather do everything on the computer, **web.telegram.org** works the
same way and still needs the phone number and the code.

---

## 2. Find BotFather

BotFather is Telegram's own account for making bots. It is a bot that makes bots.

- Tap the **magnifying glass** at the top of the screen
- Type **BotFather**
- Tap the result called **BotFather** with a **blue tick** beside it

The blue tick matters. There are copycat accounts with similar names, and the
verified one is the only one to use.

- Tap **Start** at the bottom

It replies with a long list of commands. You need one of them.

---

## 3. Make your bot

In that chat with BotFather:

1. Send **`/newbot`**

2. It asks for a **name**. This is the display name you will see at the top of
   the chat. Send:

   > Hue & Heal Studio

3. It asks for a **username**. Different thing: this is the unique handle, it
   has to end in `bot`, and it has to be one nobody has taken. Try:

   > hueandheal_studio_bot

   If it says the name is taken, add a number and send it again.

4. It replies with **Done! Congratulations on your new bot** and, a few lines
   down, under **Use this token to access the HTTP API**, a long line that looks
   like:

   ```
   8123456789:AAHm4x-QUITEALONGSTRINGOFLETTERSANDNUMBERS
   ```

   **That line is the token.** It is a password for the bot: anyone who has it
   can send messages as your bot, so do not paste it into a chat, an email, or
   this conversation. Copy it (tap and hold, Copy) and keep it on the clipboard
   for the next step.

Nothing is public yet. A bot only talks to people who message it first, and in
the next steps it gets locked to your chat and yours only.

---

## 4. Run one command here

On the computer, in the project folder, run:

```bash
bash scripts/setup-telegram.sh
```

It asks **Bot token:** and waits. Paste the token and press Enter. Nothing
appears on screen as you paste, which is deliberate: it keeps the token out of
your terminal history.

The script then checks the token with Telegram, saves it to the copilot's
server, and tells Telegram where to send your messages. It prints your bot's
`@username` when it finishes.

If it says the token does not look right, go back to the BotFather chat and
copy the line again. Copy only that line, no spaces at either end. If you have
lost it, send BotFather **`/mybots`**, pick your bot, then **API Token**.

---

## 5. Pair your chat

Now connect the bot to a workspace.

1. In the copilot, open **Settings**, then the **Channel** tab
2. Make sure the workspace at the top left says the one you want (**Hue & Heal**
   or **Remedae**), because the link is per workspace
3. Click **Generate pairing code**. Six characters appear, like `K7M2QP`
4. In Telegram, open your new bot and send:

   ```
   /start K7M2QP
   ```

It replies confirming which studio it is linked to and who is on the team.

Do the same again from the other workspace, with its own code, and each brand
gets its own chat. That separation is the point: the Remedae chat never shows
Hue & Heal's work.

---

## Then what

Type into that chat like you would to a colleague:

```
@cmo what should we ship this week?
/roles      the team, their cadence, what is waiting on you
/inbox      requests and experiments awaiting your call
/approve a1b2      approve, or /decline, using the code from /inbox
/digest     the latest weekly digests
```

Anything you type without an `@name` goes to the CMO. Any role with a cadence
sends its morning work and its Friday digest to that chat by itself. To stop
that, use the toggle in Settings → Channel.

---

## If something goes wrong

**The bot does not reply at all.** The webhook did not register. Re-run
`bash scripts/setup-telegram.sh`.

**It says the chat is not linked.** The code was used already or a new one was
generated after it. Generate a fresh code in Settings → Channel and send
`/start` with that one.

**You want to start over.** Settings → Channel → Unlink, then generate a new
code. To retire the bot entirely, send BotFather `/deletebot`.
