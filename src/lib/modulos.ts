/** Módulos do app, na ordem de desenvolvimento combinada. */
export const MODULOS = [
  { id: "melhorias", nome: "Melhorias e manutenção", desc: "Abra chamados e apoie os dos vizinhos", icone: "🔧", href: "/melhorias" },
  { id: "comunicados", nome: "Comunicados e enquetes", desc: "Avisos oficiais e votações", icone: "📢", href: "/comunicados" },
  { id: "ocorrencias", nome: "Ocorrências e sugestões", desc: "Reclamações com protocolo", icone: "📝", href: "/ocorrencias" },
  { id: "reservas", nome: "Reservas e eventos", desc: "Salão, churrasqueiras e quadras", icone: "📅", href: "/reservas" },
  { id: "vitrine", nome: "Vitrine de serviços", desc: "Serviços de vizinhos e descontos", icone: "🛍️", href: "/vitrine" },
  { id: "mural", nome: "Mural da comunidade", desc: "Classificados, doações e caronas", icone: "📌", href: "/mural" },
  { id: "portaria", nome: "Portaria digital", desc: "Visitantes e encomendas", icone: "🚪", href: "/portaria" },
  { id: "assistente", nome: "Assistente virtual", desc: "Tire dúvidas sobre o regimento", icone: "💬", href: "/assistente" },
  { id: "pontos", nome: "Meus pontos", desc: "Participe e ganhe descontos", icone: "⭐", href: "/pontos" },
  { id: "consumo", nome: "Água e gás", desc: "Seu consumo mês a mês", icone: "💧", href: "/consumo" },
  { id: "apoio", nome: "Rede de apoio", desc: "Vizinhos ajudando vizinhos", icone: "🤝", href: "/apoio" },
  { id: "igreen", nome: "Clube de vantagens iGreen", desc: "Parceria comercial · adesão opcional", icone: "⚡", href: "/clube" },
] as const;

/** Módulos já liberados (cresce a cada etapa validada). */
export const MODULOS_ATIVOS = new Set<string>([]);
