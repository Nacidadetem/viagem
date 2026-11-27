export type Papel =
  | "morador"
  | "prestador"
  | "zelador"
  | "manutencao"
  | "portaria"
  | "administracao"
  | "sindico";

export type StatusCadastro = "pendente" | "aprovado" | "rejeitado" | "suspenso";
export type TipoVinculo = "titular" | "dependente";

export interface Perfil {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  bloco_informado: string;
  predio_informado: string | null;
  apto_informado: string;
  unidade_id: number | null;
  tipo_vinculo: TipoVinculo;
  status: StatusCadastro;
  motivo_status: string | null;
  fonte_grande: boolean;
  created_at: string;
}

export interface ItemFila {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo_vinculo: TipoVinculo;
  bloco_informado: string;
  predio_informado: string | null;
  apto_informado: string;
  unidade_id: number | null;
  bloco: string | null;
  predio: string | null;
  apartamento: string | null;
  moradores_na_unidade: number;
  titular_existente: string | null;
  status: StatusCadastro;
  motivo_status: string | null;
  created_at: string;
}

export const NOME_PAPEL: Record<Papel, string> = {
  morador: "Morador(a)",
  prestador: "Prestador(a) de serviço",
  zelador: "Zeladoria",
  manutencao: "Manutenção",
  portaria: "Portaria",
  administracao: "Administração",
  sindico: "Síndico(a)",
};

export const VERSAO_TERMOS = "1.0";
