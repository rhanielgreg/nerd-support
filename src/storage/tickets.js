import { dataFile } from "./paths.js";
import { activeTickets } from "../state.js";
import fs from "node:fs";

function saveActiveTickets() {
  try {
    fs.writeFileSync(
      dataFile("active_tickets.json"),
      JSON.stringify(activeTickets, null, 2),
    );
    console.log(`Saved ${activeTickets.length} active tickets`);
  } catch (error) {
    console.error("Error saving active tickets:", error);
  }
}

// Função para carregar tickets ativos
function loadActiveTickets() {
  try {
    if (fs.existsSync(dataFile("active_tickets.json"))) {
      const data = fs.readFileSync(dataFile("active_tickets.json"), "utf8");
      activeTickets.splice(0, activeTickets.length, ...JSON.parse(data));
      console.log(`Loaded ${activeTickets.length} active tickets`);

      // Listar todos os tickets carregados para depuração
      console.log("Tickets carregados:");
      activeTickets.forEach((t) => {
        console.log(
          `- ID: ${t.id}, Status: ${t.status}, DiscordChannelId: ${t.discordChannelId || "Nenhum"}`,
        );
      });
    } else {
      console.log(
        "Arquivo active_tickets.json não encontrado, iniciando com lista vazia",
      );
      activeTickets.length = 0;
    }
  } catch (error) {
    console.error("Error loading active tickets:", error);
    activeTickets.length = 0;
  }
}

export { saveActiveTickets, loadActiveTickets };
