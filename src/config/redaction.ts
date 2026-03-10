import fastRedact from 'fast-redact';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './index.js';

/**
 * Lista padrão de chaves sensíveis (Massiva).
 */
export const SENSITIVE_KEYS_BASE = [
  "password", "pass", "pwd", "senha", "passphrase", "secret", "secret_key", "client_secret", "private_key", "pub_key", "api_key", "apikey", "access_key", "secret_access_key", "session_key", "encryption_key",
  "token", "accessToken", "refreshToken", "jwt", "id_token", "auth", "authorization", "bearer", "oauth", "x-api-key", "x-auth-token", "cookie", "set-cookie", "session_id", "sid", "phpsessid", "jsessionid",
  "cpf", "cnpj", "rg", "cnh", "pis", "pasep", "titulo_eleitor", "ssn", "social_security", "passport", "passaporte", "dni", "nie", "nif", "voter_id", "driver_license", "state_id", "national_id",
  "cartao", "card", "credit_card", "debit_card", "cvv", "cvc", "pin", "card_number", "numero_cartao", "card_holder", "titular_cartao", "expiry_date", "expiration_month", "expiration_year", "pan", "pci",
  "email", "e-mail", "mail", "address", "endereco", "logradouro", "numero", "complemento", "bairro", "city", "cidade", "state", "estado", "country", "pais", "cep", "zipcode", "postcode",
  "telefone", "phone", "celular", "mobile", "whatsapp", "telegram", "contact_number", "fax", "work_phone", "home_phone",
  "birthdate", "data_nascimento", "nascimento", "dob", "age", "idade", "gender", "genero", "sex", "sexo", "race", "etnia", "religion", "religiao", "sexual_orientation", "political_affiliation",
  "ip", "ip_address", "mac_address", "host", "hostname", "domain", "url", "uri", "proxy", "vpn", "ssh_key", "aws_key", "aws_secret", "azure_key", "gcp_key", "firebase_key",
  "salt", "hash", "nonce", "signature", "fingerprint", "credential", "login", "user", "username", "account", "profile", "id_usuario", "user_id", "external_id", "uuid", "guid",
  "account_number", "routing_number", "bank_account", "agencia", "conta", "conta_corrente", "conta_poupanca", "iban", "swift", "bic", "pix", "chave_pix", "wallet", "wallet_address", "crypto", "bitcoin", "ethereum",
  "valor", "montante", "amount", "balance", "saldo", "salary", "salario", "income", "renda", "tax", "imposto", "invoice", "fatura", "receipt", "payment", "pagamento", "transaction_id", "order_id",
  "latitude", "longitude", "coords", "coordinates", "location", "localizacao", "geo", "gps", "tracking_id",
  "medical_record", "health_id", "insurance_id", "plano_saude", "paciente", "patient", "diagnosis", "diagnostico", "prescription", "receita", "medication", "medicamento",
  "mother_name", "nome_mae", "father_name", "nome_pai", "spouse", "conjuge", "family_name", "surname", "sobrenome", "first_name", "last_name", "full_name", "nome_completo"
];

/**
 * Tenta carregar chaves de um arquivo externo se definido no .env (LOG_SENSITIVE_FILE).
 */
function carregarChavesExtras(): string[] {
  const caminhoArquivo = env.LOG_SENSITIVE_FILE;
  if (!caminhoArquivo || !fs.existsSync(caminhoArquivo)) return [];

  try {
    const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
    const extensao = path.extname(caminhoArquivo).toLowerCase();

    if (extensao === '.json') {
      const parsed = JSON.parse(conteudo);
      return Array.isArray(parsed) ? parsed : (parsed.sensitiveKeys || []);
    }

    if (extensao === '.csv' || extensao === '.txt') {
      return conteudo
        .split(/[,\n;\r]/)
        .map(k => k.trim())
        .filter(k => k.length > 0);
    }
  } catch (erro: any) {
    console.warn(`[ ConfigLogger ] Erro ao ler arquivo de chaves sensíveis '${caminhoArquivo}': ${erro.message}`);
  }

  return [];
}

// Combina a base massiva com as chaves customizadas do usuário
export const SENSITIVE_KEYS = [...new Set([...SENSITIVE_KEYS_BASE, ...carregarChavesExtras()])];

/**
 * Gera caminhos para o fast-redact cobrindo vários níveis de profundidade.
 * O fast-redact exige que chaves com caracteres especiais (como hífens)
 * sejam colocadas entre colchetes e aspas: ["x-api-key"]
 */
const generateRedactPaths = (keys: string[], depth = 6) => {
  const paths: string[] = [];
  keys.forEach(key => {
    const isSimple = /^[a-zA-Z0-9_]+$/.test(key);
    const part = isSimple ? key : `["${key}"]`;
    const separator = isSimple ? '.' : '';
    
    // Nível 0
    paths.push(part); 
    
    // Níveis subsequentes
    let prefix = '*';
    for (let i = 1; i < depth; i++) {
      paths.push(`${prefix}${separator}${part}`);
      prefix += '.*';
    }
  });
  return paths;
};

/**
 * Instância configurada do redator de dados.
 */
export const redact = fastRedact({
  paths: generateRedactPaths(SENSITIVE_KEYS),
  censor: '[REDACTED]',
  serialize: false // Retorna o objeto modificado ao invés de string JSON
});
