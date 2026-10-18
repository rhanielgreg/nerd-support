const $ = (selector) => document.querySelector(selector);
let initialized = false;
let current = null;
let busy = false;
let toastTimer;
async function api(url, method = "GET", body) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && url === "/api/dashboard") showAccess();
    throw new Error(
      data.error?.message ||
        data.error ||
        data.message ||
        "Não foi possível concluir a solicitação.",
    );
  }
  return data;
}
function toast(message, error = false) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").className = error ? "error" : "";
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => {
    $("#toast").hidden = true;
  }, 6500);
}
function showAccess() {
  current = null;
  $("#access").hidden = false;
  $("#dashboard").hidden = true;
  $("#logout").hidden = true;
  $("#name-label").hidden = initialized;
  $("#name-label input").required = !initialized;
  $("#access-title").textContent = initialized
    ? "Bom ter você de volta."
    : "Seu suporte, do seu jeito.";
  $("#access-description").textContent = initialized
    ? "Entre para acompanhar e gerenciar seu atendimento."
    : "Crie sua conta para conectar os canais e começar a atender.";
  $("#form-title").textContent = initialized
    ? "Entre no seu workspace"
    : "Crie seu administrador";
  $("#access-form .section-label").textContent = initialized
    ? "BEM-VINDO DE VOLTA"
    : "PRIMEIRO ACESSO";
  $("#access-submit").textContent = initialized
    ? "Entrar no painel ↗"
    : "Criar minha conta ↗";
  $("#access-form [name=password]").autocomplete = initialized
    ? "current-password"
    : "new-password";
  $("#profile-name").textContent = "Acesso ao workspace";
  $("#profile-email").textContent = "Nerd Support";
}
function render(data, fill = false) {
  current = data;
  $("#access").hidden = true;
  $("#dashboard").hidden = false;
  $("#logout").hidden = false;
  $("#profile-name").textContent = data.user.name;
  $("#profile-email").textContent = data.user.email;
  $("#workspace-name").textContent =
    data.settings.companyName || "Seu espaço de suporte";
  $("#ticket-count").textContent = data.tickets.length;
  $("#nav-count").textContent = data.tickets.length;
  const { state, error, telegramName, discordName } = data.runtime;
  const running = state === "running";
  const connecting = state === "starting";
  $("#status-pill").textContent = {
    running: "● Atendimento conectado",
    starting: "◌ Conectando…",
    stopped: "● Desconectado",
    error: "● Falha na conexão",
  }[state];
  $("#status-pill").className = `status-pill ${state}`;
  for (const [platform, badge, configured, name] of [
    ["telegram", "tg", data.settings.telegramConfigured, telegramName],
    ["discord", "dc", data.settings.discordConfigured, discordName],
  ]) {
    $(`#${platform}-state`).textContent = running
      ? "Conectado"
      : connecting
        ? "Conectando…"
        : configured
          ? "Pronto para conectar"
          : "Não configurado";
    $(`#${badge}-badge`).textContent = configured
      ? "Token salvo"
      : "Não configurado";
    $(`#${platform}-name`).textContent = name
      ? `@${name}`
      : platform === "telegram"
        ? "Seu canal com o cliente"
        : "O espaço da sua equipe";
    $(`#${badge}-secret-hint`).textContent = configured
      ? "Token salvo com proteção. Deixe vazio para manter ou preencha para substituir."
      : platform === "telegram"
        ? "Crie seu bot com o @BotFather no Telegram."
        : "Ative o Message Content Intent no portal do Discord.";
  }
  $("#runtime-error").textContent = error || "";
  $("#start").hidden = running;
  $("#stop").hidden = !running && state !== "error";
  $("#start").disabled = connecting || busy;
  $("#stop").disabled = connecting || busy;
  $("#verify").disabled = connecting || busy;
  $("#save-button").disabled = running || connecting || busy;
  $("#save-hint").textContent = running
    ? "Pare os bots para editar os dados."
    : "Salve antes de conectar os bots.";
  $("#test-message").disabled = !running || busy;
  for (const input of $("#settings-form").querySelectorAll("input[name]")) {
    input.disabled = running || connecting;
    if (fill && !input.name.endsWith("Token"))
      input.value = data.settings[input.name] || "";
  }
  list(
    "#tickets-list",
    data.tickets,
    (t) => [`#${t.id} · ${t.subject}`, t.username, t.createdAt],
    "Nenhum ticket aberto. Seu primeiro atendimento começa no Telegram.",
  );
  list(
    "#history-list",
    data.history,
    (h) => [h.action, h.actor, h.at],
    "As primeiras ações aparecerão aqui.",
  );
}
function list(selector, items, format, empty) {
  const container = $(selector);
  container.replaceChildren();
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = empty;
    container.append(p);
    return;
  }
  for (const item of items) {
    const [title, description, date] = format(item);
    const row = document.createElement("div");
    row.className = "list-row";
    const text = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = title;
    const small = document.createElement("small");
    small.textContent = description;
    const time = document.createElement("small");
    time.textContent = new Date(date).toLocaleString("pt-BR");
    text.append(strong, small);
    row.append(text, time);
    container.append(row);
  }
}
async function refresh(fill = false) {
  render(await api("/api/dashboard"), fill);
}
$("#access-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#access-submit");
  button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!initialized) {
      await api("/api/setup", "POST", values);
      initialized = true;
    }
    await api("/api/auth/sign-in/email", "POST", {
      email: values.email,
      password: values.password,
    });
    event.target.reset();
    await refresh(true);
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
  }
});
$("#logout").addEventListener("click", async () => {
  try {
    await api("/api/auth/sign-out", "POST", {});
    current = null;
    $("#settings-form").reset();
    showAccess();
  } catch (error) {
    toast(error.message, true);
  }
});
$("#settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  busy = true;
  $("#save-button").disabled = true;
  try {
    await api(
      "/api/settings",
      "PUT",
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    for (const field of ["telegramToken", "discordToken"])
      event.target.elements[field].value = "";
    await refresh();
    toast("Configurações salvas. Você já pode validar as integrações.");
  } catch (error) {
    toast(error.message, true);
  } finally {
    busy = false;
    if (current) render(current);
  }
});
for (const action of ["verify", "start", "stop"]) {
  $(`#${action}`).addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    if (current) render(current);
    toast(
      {
        verify: "Validando os dados salvos…",
        start: "Conectando seus bots…",
        stop: "Encerrando as conexões…",
      }[action],
    );
    try {
      const result = await api(`/api/bot/${action}`, "POST", {});
      await refresh();
      toast(
        action === "verify"
          ? `Integrações válidas: @${result.telegramName} e ${result.discordName}.`
          : action === "stop"
            ? "Bots desconectados."
            : "Inicialização solicitada. Acompanhe o estado da conexão.",
      );
    } catch (error) {
      toast(error.message, true);
      await refresh().catch(() => {});
    } finally {
      busy = false;
      if (current) render(current);
    }
  });
}
$("#test-message").addEventListener("click", async () => {
  try {
    await api("/api/bot/test", "POST", {
      userId: $("#test-user-id").value.trim(),
    });
    toast("Mensagem enviada. Confira a conversa no Telegram.");
  } catch (error) {
    toast(error.message, true);
  }
});
document.querySelectorAll("[data-view]").forEach((button) =>
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-view]")
      .forEach((b) => b.classList.toggle("active", b === button));
    for (const name of ["integrations", "tickets", "history"])
      $(`#${name}-view`).hidden = name !== button.dataset.view;
    $(".topbar strong").textContent =
      button.dataset.view === "integrations"
        ? "Visão geral"
        : button.dataset.view === "tickets"
          ? "Tickets"
          : "Atividade";
  }),
);
(async () => {
  try {
    ({ initialized } = await api("/api/setup"));
    if (initialized) {
      try {
        await refresh(true);
        return;
      } catch {}
    }
    showAccess();
  } catch {
    toast(
      "O painel não conseguiu se conectar ao servidor. Atualize a página.",
      true,
    );
  }
})();
setInterval(() => {
  if (current && !busy) refresh().catch(() => {});
}, 4000);
