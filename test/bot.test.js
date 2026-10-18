import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import axios from "axios";
import { Collection } from "discord.js";
import { BOT_DISPLAY_NAME } from "../src/config.js";
import { escapeMarkdown } from "../src/utils/markdown.js";
import { getMainMenu } from "../src/telegram/menu.js";
import { handleMenu } from "../src/telegram/handlers/menu.js";
import { handleLanguageSelection } from "../src/telegram/handlers/lang.js";
import {
  activeTickets,
  userSessions,
  ticketCounters,
  userLanguages,
} from "../src/state.js";
import {
  createTicket,
  addMessage,
  closeTicket,
  getTicketById,
} from "../src/services/tickets.js";
import { loadActiveTickets } from "../src/storage/tickets.js";
import { loadUserLanguages } from "../src/storage/languages.js";
import {
  getTranslation,
  getUserLanguage,
  setUserLanguage,
} from "../src/i18n/index.js";
import { discordClient, setDiscordGuild } from "../src/clients.js";
import { registerTelegramHandlers } from "../src/telegram/index.js";
import { registerDiscordHandlers } from "../src/discord/index.js";
import { handleNewTicket } from "../src/telegram/handlers/newticket.js";
import { handleText } from "../src/telegram/handlers/text.js";
import { handlePhoto } from "../src/telegram/handlers/photo.js";
import { handleConfirmClose } from "../src/telegram/handlers/confirm_close.js";
import { handleMessage } from "../src/discord/handlers/messageCreate.js";
import { handleInteraction } from "../src/discord/handlers/interactionCreate.js";
import { sendToTelegramAPI } from "../src/telegram/api.js";
import { syncWithDiscord } from "../src/discord/channels.js";

// A persistência dos testes fica isolada dos JSONs reais do projeto.
const originalCwd = process.cwd();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nerd-support-test-"));
const originalPost = axios.post;
const originalGet = axios.get;
const originalFetch = discordClient.channels.fetch;
const originalUser = discordClient.user;
const posts = [];
const sent = [];
const channel = {
  id: "channel-test",
  name: "ticket-test",
  send: async (payload) => sent.push(payload),
  setName: async () => {},
  setParent: async () => {},
  permissionOverwrites: { edit: async () => {} },
};

process.chdir(tempDir);
beforeEach(() => {
  activeTickets.length = 0;
  for (const object of [userSessions, ticketCounters, userLanguages]) {
    for (const key of Object.keys(object)) delete object[key];
  }
  for (const name of ["active_tickets.json", "user_languages.json"]) {
    fs.rmSync(path.join(tempDir, name), { force: true });
  }
  posts.length = 0;
  sent.length = 0;
  axios.post = async (url, payload) => {
    posts.push({ url, payload });
    return { data: { ok: true } };
  };
  axios.get = async () => ({ data: Buffer.from("fake image") });
  discordClient.channels.fetch = async () => channel;
  discordClient.user = { id: "bot-test" };
  setDiscordGuild({
    roles: { everyone: { id: "everyone" }, fetch: async (id) => ({ id }) },
    channels: { create: async () => channel, fetch: async () => new Map() },
  });
});
after(() => {
  axios.post = originalPost;
  axios.get = originalGet;
  discordClient.channels.fetch = originalFetch;
  discordClient.user = originalUser;
  setDiscordGuild(null);
  process.chdir(originalCwd);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function context(text = "") {
  return {
    from: { id: 42, username: "tester", first_name: "Tester" },
    message: { text },
    reply: async () => {},
    answerCbQuery: async () => {},
    editMessageText: async () => {},
    telegram: { getFile: async () => ({ file_path: "test.jpg" }) },
  };
}

test("cria, persiste, recarrega, responde e fecha tickets sem perder a referência compartilhada", () => {
  const reference = activeTickets;
  const { ticket } = createTicket(
    42,
    "tester",
    "Tester",
    "Ajuda",
    "Descrição do problema",
  );
  assert.equal(
    createTicket(42, "tester", "Tester", "Outro", "Descrição").error,
    "already_has_ticket",
  );
  addMessage(ticket.id, "support", "Resposta", "https://example.com/image.jpg");
  activeTickets.length = 0;
  loadActiveTickets();
  assert.equal(activeTickets, reference);
  assert.equal(getTicketById(ticket.id).messages.length, 2);
  assert.equal(
    getTicketById(ticket.id).messages[1].imageUrl,
    "https://example.com/image.jpg",
  );
  assert.equal(closeTicket(ticket.id).id, ticket.id);
  assert.deepEqual(JSON.parse(fs.readFileSync("active_tickets.json")), []);
});

test("idiomas e traduções continuam disponíveis após recarregar o JSON", () => {
  setUserLanguage(42, "pt");
  delete userLanguages[42];
  loadUserLanguages();
  assert.equal(getUserLanguage(42), "pt");
  assert.equal(getUserLanguage(999), "en");
  assert.match(
    getTranslation("ticketClosed", "pt", "42_1", "Ajuda"),
    /42_1.*Ajuda/,
  );
  assert.equal(getTranslation("help", "unknown"), getTranslation("help", "en"));
});

test("JSON de tickets inválido limpa o estado sem trocar a referência", () => {
  const reference = activeTickets;
  activeTickets.push({ id: "stale" });
  fs.writeFileSync("active_tickets.json", "{invalid");
  loadActiveTickets();
  assert.equal(activeTickets, reference);
  assert.equal(activeTickets.length, 0);
});

test("registra todos os comandos, ações e eventos na ordem original", () => {
  const registrations = [];
  const client = Object.fromEntries(
    ["command", "action", "on", "catch"].map((method) => [
      method,
      (...args) => registrations.push([method, ...args]),
    ]),
  );
  registerTelegramHandlers(client);
  assert.deepEqual(
    registrations
      .filter(([method]) => method === "command")
      .map(([, commands]) => commands),
    [
      ["start"],
      ["help", "ajuda", "ayuda"],
      ["newticket", "novoticket", "nuevoticket"],
      ["mytickets", "meustickets", "mistickets"],
      ["language", "idioma"],
    ],
  );
  assert.equal(
    registrations.filter(([method]) => method === "action").length,
    5,
  );
  assert.deepEqual(
    registrations
      .filter(([method]) => method === "on")
      .map(([, event]) => event),
    ["text", "photo"],
  );
  assert.ok(
    registrations.every(
      (registration) => typeof registration.at(-1) === "function",
    ),
  );
  registrations.length = 0;
  registerDiscordHandlers(client);
  assert.deepEqual(
    registrations.map(([, event]) => event),
    ["ready", "messageCreate", "interactionCreate"],
  );
});

test("Telegram: assunto, descrição e resposta chegam ao canal Discord", async () => {
  await handleNewTicket(context());
  assert.equal(userSessions[42].state, "awaiting_subject");
  await handleText(context("Ajuda"));
  assert.equal(userSessions[42].state, "awaiting_description");
  await handleText(context("Descrição completa do problema"));
  assert.equal(activeTickets.length, 1);
  assert.equal(activeTickets[0].discordChannelId, channel.id);
  assert.equal(userSessions[42].state, "replying");
  await handleText(context("Mais informações"));
  assert.equal(activeTickets[0].messages.at(-1).content, "Mais informações");
  assert.match(sent.at(-1).embeds[0].data.description, /Mais informações/);
  await handleNewTicket(context());
  assert.equal(activeTickets.length, 1);
});

test("Telegram: conversa sem sessão apresenta menu e botão inicia o ticket", async () => {
  userLanguages[42] = "pt";
  const ctx = context("bom dia");
  const replies = [];
  let acknowledged = false;
  ctx.reply = async (text, options) => replies.push({ text, options });
  ctx.answerCbQuery = async () => {
    acknowledged = true;
  };
  await handleText(ctx);
  const buttons = replies[0].options.reply_markup.inline_keyboard.flat();
  assert.deepEqual(
    buttons.map((button) => button.callback_data),
    ["menu_newticket", "menu_mytickets", "menu_help", "menu_language"],
  );
  assert.equal(buttons[0].text, "🎫 Abrir ticket");
  assert.equal(userSessions[42], undefined);
  ctx.match = ["menu_newticket", "newticket"];
  await handleMenu(ctx);
  assert.equal(acknowledged, true);
  assert.equal(userSessions[42].state, "awaiting_subject");
  assert.equal(activeTickets.length, 0);
  // O clique não vira assunto, descrição ou mensagem do atendimento.
  ctx.match = ["menu_help", "help"];
  await handleMenu(ctx);
  assert.equal(userSessions[42].state, "awaiting_subject");
  assert.equal(activeTickets.length, 0);
});

test("Telegram: botões seguem o idioma e troca de idioma mantém o menu disponível", async () => {
  assert.equal(
    getMainMenu("en").reply_markup.inline_keyboard[0][0].text,
    "🎫 Open ticket",
  );
  assert.equal(
    getMainMenu("es").reply_markup.inline_keyboard[1][0].text,
    "📋 Mi ticket",
  );
  const ctx = context();
  ctx.match = ["lang_pt", "pt"];
  let menu;
  ctx.editMessageText = async (_text, options) => {
    menu = options;
  };
  await handleLanguageSelection(ctx);
  assert.equal(getUserLanguage(42), "pt");
  assert.equal(menu.reply_markup.inline_keyboard[2][1].text, "🌐 Idioma");
});

test("Telegram: imagem cria ticket e outra imagem vira resposta", async () => {
  await handleNewTicket(context());
  await handleText(context("Problema com imagem"));
  const ctx = context();
  ctx.message = {
    photo: [{ file_id: "small" }, { file_id: "large" }],
    caption: "Veja o problema",
  };
  await handlePhoto(ctx);
  assert.equal(activeTickets.length, 1);
  assert.match(activeTickets[0].messages[0].imageUrl, /test.jpg$/);
  assert.equal(sent.at(-1).files.length, 1);
  delete userSessions[42];
  await handlePhoto(ctx);
  assert.equal(activeTickets[0].messages.length, 2);
  assert.equal(userSessions[42].state, "replying");
});

test("Discord: respostas em texto e imagem são persistidas e enviadas ao Telegram", async () => {
  const { ticket } = createTicket(42, "tester", "Tester", "Ajuda", "Descrição");
  const reactions = [];
  const message = {
    author: { id: "mod", username: "moderator", bot: false },
    channel: {
      name: "ticket-test",
      topic: `Ticket #${ticket.id} | Telegram ID: 42`,
    },
    content: "Resposta do moderador",
    attachments: { size: 0 },
    react: async (reaction) => reactions.push(reaction),
    reply: async (text) => assert.fail(text),
  };
  await handleMessage(message);
  assert.equal(posts.at(-1).payload.chat_id, "42");
  assert.match(posts.at(-1).payload.text, /Resposta do moderador/);
  assert.ok(
    posts
      .at(-1)
      .payload.text.startsWith(`${escapeMarkdown(BOT_DISPLAY_NAME)}: `),
  );
  message.attachments = {
    size: 1,
    first: () => ({
      contentType: "image/png",
      url: "https://example.com/image.png",
    }),
  };
  await handleMessage(message);
  assert.match(posts.at(-1).url, /sendPhoto$/);
  assert.equal(posts.at(-1).payload.photo, "https://example.com/image.png");
  assert.equal(
    posts.at(-1).payload.caption,
    `${BOT_DISPLAY_NAME}: Resposta do moderador`,
  );
  assert.equal(ticket.messages.length, 3);
  assert.deepEqual(reactions, ["✅", "✅"]);
});

test("Telegram API tenta texto simples quando Markdown falha", async () => {
  let attempts = 0;
  axios.post = async (_url, payload) => {
    attempts++;
    if (attempts === 1) throw new Error("Invalid Markdown");
    assert.equal(payload.parse_mode, undefined);
    assert.equal(
      payload.reply_markup.inline_keyboard[0][0].callback_data,
      "direct_close_42_1",
    );
    return { data: { ok: true } };
  };
  assert.equal(await sendToTelegramAPI(42, "Resposta", "42_1"), true);
  assert.equal(attempts, 2);
});

test("fechamento pelo Telegram remove ticket e sessão e arquiva o canal", async () => {
  const { ticket } = createTicket(42, "tester", "Tester", "Ajuda", "Descrição");
  ticket.discordChannelId = channel.id;
  userSessions[42] = { state: "replying", ticketId: ticket.id };
  const ctx = context();
  ctx.match = [null, ticket.id];
  let archived = false;
  channel.setName = async (name) => {
    archived = name.startsWith("closed-");
  };
  await handleConfirmClose(ctx);
  assert.equal(activeTickets.length, 0);
  assert.equal(userSessions[42], undefined);
  assert.equal(archived, true);
});

test("fechamento pelo Discord remove ticket e notifica o usuário", async () => {
  const { ticket } = createTicket(42, "tester", "Tester", "Ajuda", "Descrição");
  channel.topic = `Ticket #${ticket.id} | Telegram ID: 42`;
  await handleInteraction({
    isButton: () => true,
    customId: `close_${ticket.id}`,
    channel,
    reply: async () => {},
  });
  assert.equal(activeTickets.length, 0);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].payload.chat_id, "42");
});

test("sincronização do Discord restaura tickets no estado e no JSON", async () => {
  setDiscordGuild({
    channels: {
      fetch: async () =>
        new Collection([
          [
            "restored",
            {
              id: "restored",
              type: 0,
              name: "ticket-42-ajuda",
              topic: "Ticket #42_7 | Telegram ID: 42",
              createdAt: new Date(),
            },
          ],
        ]),
    },
  });
  await syncWithDiscord();
  assert.equal(activeTickets[0].id, "42_7");
  assert.equal(activeTickets[0].discordChannelId, "restored");
  assert.equal(
    JSON.parse(fs.readFileSync("active_tickets.json"))[0].id,
    "42_7",
  );
});
