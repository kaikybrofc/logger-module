#!/bin/bash

# Define que o script vai parar de executar se qualquer comando falhar (segurança e fail-fast)
set -e
set -o pipefail

# --- Cores e Formatação ---
VERDE='\033[0;32m'
VERMELHO='\033[0;31m'
AMARELO='\033[1;33m'
AZUL='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${VERDE}[INFO]${NC} $1"; }
log_warn() { echo -e "${AMARELO}[AVISO]${NC} $1"; }
log_error() { echo -e "${VERMELHO}[ERRO]${NC} $1"; }
log_step() { echo -e "\n${AZUL}>>>>> $1 <<<<<${NC}"; }

# --- Carregar Configurações (Ambiente e .env) ---
if [ -f .env ]; then
  log_info "Carregando variáveis do arquivo .env..."
  set -a
  source .env
  set +a
fi

GITHUB_TOKEN="${GITHUB_TOKEN:-}"
NPM_TOKEN="${NPM_TOKEN:-}"

if [ -z "$GITHUB_TOKEN" ]; then
  log_error "GITHUB_TOKEN não está definido. Verifique o arquivo .env."
  exit 1
fi

if [ -z "$NPM_TOKEN" ]; then
  log_error "NPM_TOKEN não está definido. Verifique o arquivo .env."
  exit 1
fi

# --- Validação de Pré-requisitos ---
if ! command -v jq &> /dev/null; then
  log_error "O comando 'jq' é necessário para ler arquivos JSON. Instale-o (ex: sudo apt install jq)."
  exit 1
fi

# Variáveis do Repositório
REPO_URL=$(jq -r '.repository.url' package.json | sed -E 's|git\+https://github.com/||g' | sed 's|\.git||')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
PACKAGE_NAME=$(jq -r '.name' package.json)
PACKAGE_SCOPE=$(echo "$PACKAGE_NAME" | sed -n 's/^@\([^/]*\)\/.*/\1/p')

if [ -z "$PACKAGE_SCOPE" ]; then
  log_error "O pacote em package.json precisa ser escopado (@owner/nome) para publicar no GitHub Packages."
  exit 1
fi

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  log_warn "Você está na branch '$CURRENT_BRANCH'. É recomendado fazer release na branch 'main'."
  read -p "Deseja continuar? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

if ! git diff-index --quiet HEAD --; then
  log_warn "Detectadas alterações não commitadas. Realizando commit automático antes da release..."
  git add .
  git commit -m "chore: save points before release $(date +'%Y-%m-%d %H:%M:%S')" || true
  log_info "Alterações commitadas com sucesso."
fi

# --- 1. Validação Antecipada dos Tokens (Segurança/Rollback Preventivo) ---
log_step "Validando Tokens de Acesso"

log_info "Verificando token do GitHub..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token ${GITHUB_TOKEN}" https://api.github.com/user)
if [ "$HTTP_STATUS" != "200" ]; then
  log_error "GITHUB_TOKEN inválido ou expirado. (Código de resposta: $HTTP_STATUS)"
  log_warn "Ação cancelada de forma segura antes de realizar qualquer alteração."
  exit 1
fi
log_info "GitHub Token: OK"

log_info "Verificando token do NPM..."
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc_temp
if ! npm whoami --userconfig .npmrc_temp &> /dev/null; then
  log_error "NPM_TOKEN inválido ou sem permissão de publicação."
  log_warn "Ação cancelada de forma segura antes de realizar qualquer alteração."
  rm -f .npmrc_temp
  exit 1
fi
log_info "NPM Token: OK"

log_info "Verificando publicação no GitHub Packages..."
{
  echo "@${PACKAGE_SCOPE}:registry=https://npm.pkg.github.com"
  echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}"
  echo "always-auth=true"
} > .npmrc_github_temp

if ! npm whoami --registry https://npm.pkg.github.com --userconfig .npmrc_github_temp &> /dev/null; then
  log_error "GITHUB_TOKEN inválido para npm.pkg.github.com ou sem permissão de package:write."
  log_warn "Ação cancelada de forma segura antes de realizar qualquer alteração."
  rm -f .npmrc_temp .npmrc_github_temp
  exit 1
fi
log_info "GitHub Packages: OK"

# --- 2. Lógica de Versionamento Customizada ---
log_step "Calculando Nova Versão"
CURRENT_VERSION=$(jq -r '.version' package.json)
log_info "Versão Atual: $CURRENT_VERSION"

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Se o patch chegar a 9 (o próximo seria 10), mudamos a versão menor e zeramos o patch.
if [ "$PATCH" -ge 9 ]; then
  NEW_MINOR=$((MINOR + 1))
  NEW_PATCH=0
  NEW_VERSION="$MAJOR.$NEW_MINOR.$NEW_PATCH"
else
  NEW_PATCH=$((PATCH + 1))
  NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
fi

log_info "Nova Versão Calculada: $NEW_VERSION"

# --- 3. Geração do Changelog ---
log_step "Gerando Notas de Lançamento (Changelog)"
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
  log_info "Nenhuma tag anterior encontrada. Coletando histórico inteiro."
  COMMITS_LOG=$(git log --oneline | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  CHANGED_FILES=$(git log --name-only --oneline | grep -v '^[a-z0-9]' | sort -u | grep -v '^$' | awk '{print "- " $0}' | sed ':a;N;$!ba;s/\n/\\n/g')
else
  log_info "Encontrada tag anterior: $LAST_TAG"
  COMMITS_LOG=$(git log ${LAST_TAG}..HEAD --oneline | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  CHANGED_FILES=$(git diff --name-only ${LAST_TAG}..HEAD | awk '{print "- " $0}' | sed ':a;N;$!ba;s/\n/\\n/g')
fi

# Cria as notas de release formatadas para enviar à API do GitHub (em JSON literal)
RELEASE_NOTES="### 📝 Commits (desde ${LAST_TAG:-início}):\n${COMMITS_LOG}\n\n### 📂 Arquivos Alterados:\n${CHANGED_FILES}"

# --- Função de Rollback (Mecanismo de Segurança Durante as Alterações) ---
rollback() {
  log_step "ERRO DETECTADO - INICIANDO ROLLBACK"
  log_error "Uma etapa falhou! Revertendo alterações no repositório local..."
  
  # Remove o .npmrc_temp
  rm -f .npmrc_temp .npmrc_github_temp
  
  # Remove a tag local se tiver sido criada
  if git rev-parse "v${NEW_VERSION}" >/dev/null 2>&1; then
    git tag -d "v${NEW_VERSION}" || true
  fi
  
  # Reverte os commits não enviados (reseta para origin/HEAD se estivermos sincronizados)
  git reset --hard "origin/$CURRENT_BRANCH" || git reset --hard HEAD
  
  # Limpa os arquivos de release locais gerados
  rm -f release_assets.tar.gz package.tmp.json
  
  # Tenta deletar a tag no servidor caso ela tenha subido
  if git ls-remote --tags origin "refs/tags/v${NEW_VERSION}" | grep -q "v${NEW_VERSION}"; then
    log_warn "A tag v${NEW_VERSION} já foi enviada ao GitHub, tentando deletá-la..."
    git push --delete origin "v${NEW_VERSION}" || log_warn "Não foi possível remover a tag remotamente."
  fi
  
  log_info "Rollback concluído. Nenhuma release foi efetivada."
  exit 1
}

# --- 4. Build e Atualização ---
# A partir deste ponto, ativamos o mecanismo de rollback automático em caso de erro
trap 'rollback' ERR

log_step "Construindo (Build) e Empacotando"

# Atualizando package.json (versão local)
jq ".version = \"$NEW_VERSION\"" package.json > package.tmp.json && mv package.tmp.json package.json

log_info "Instalando dependências para garantir uma build limpa..."
npm ci

log_info "Rodando o comando de build..."
npm run build

log_info "Compactando os arquivos compilados (pasta dist)..."
# Criando um arquivo tar.gz do dist/ e package.json para anexar na release do GitHub
tar -czf release_assets.tar.gz dist/ package.json

log_info "Adicionando modificações de versão ao Git..."
git add package.json package-lock.json || true
git commit -m "chore(release): versão $NEW_VERSION"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

# --- 5. Publicação no NPM ---
log_step "Publicando pacote compilado no NPM"
# Usa o token validado para publicar
npm publish --userconfig .npmrc_temp --access public
log_info "Pacote v${NEW_VERSION} publicado com sucesso no NPM!"

log_step "Publicando pacote compilado no GitHub Packages"
npm publish --registry https://npm.pkg.github.com --userconfig .npmrc_github_temp
log_info "Pacote v${NEW_VERSION} publicado com sucesso no GitHub Packages!"

# Limpando credenciais temporárias após uso com sucesso
rm -f .npmrc_temp .npmrc_github_temp

# --- 6. Publicação no GitHub ---
log_step "Enviando alterações e criando Release no GitHub"
log_info "Fazendo push dos commits e da nova tag..."
# Enviando commits sem disparar o trap em caso de warning comum, mas falhando se a conexão cair
git push origin "$CURRENT_BRANCH"
git push origin "v${NEW_VERSION}"

log_info "Criando Release oficial na página do GitHub via API..."
API_PAYLOAD="{\"tag_name\":\"v${NEW_VERSION}\",\"target_commitish\":\"${CURRENT_BRANCH}\",\"name\":\"Release v${NEW_VERSION}\",\"body\":\"${RELEASE_NOTES}\",\"draft\":false,\"prerelease\":false}"

RELEASE_RESPONSE=$(curl -s -X POST "https://api.github.com/repos/${REPO_URL}/releases" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d "$API_PAYLOAD")

# Verifica se a release foi criada corretamente extraindo o ID
RELEASE_ID=$(echo "$RELEASE_RESPONSE" | jq -r .id)

if [ "$RELEASE_ID" == "null" ] || [ -z "$RELEASE_ID" ]; then
  ERROR_MSG=$(echo "$RELEASE_RESPONSE" | jq -r .message)
  log_error "Falha ao criar release no GitHub (Erro da API: $ERROR_MSG)"
  # Retorna falso para engatilhar o TRAP e dar Rollback
  false
fi

log_info "Release criada no GitHub! (ID: $RELEASE_ID). Enviando arquivos compilados (.tar.gz)..."

# Envia o arquivo compilado como asset da release para o GitHub (Upload)
UPLOAD_URL="https://uploads.github.com/repos/${REPO_URL}/releases/${RELEASE_ID}/assets?name=release_dist.tar.gz"

HTTP_STATUS_UPLOAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$UPLOAD_URL" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Content-Type: application/gzip" \
  --data-binary @"release_assets.tar.gz")

if [ "$HTTP_STATUS_UPLOAD" != "201" ]; then
  log_warn "A release foi criada, mas houve um erro ao fazer o upload dos binários (Código HTTP $HTTP_STATUS_UPLOAD)."
  log_warn "O NPM já possui a versão compilada correta."
else
  log_info "Upload dos arquivos compilados feito com sucesso no GitHub!"
fi

# Limpando artefatos temporários
rm -f release_assets.tar.gz

# Sucesso! Desativando o trap
trap - ERR

log_step "SUCESSO!"
echo -e "${VERDE}A versão v${NEW_VERSION} foi sincronizada perfeitamente.${NC}"
echo -e "✅ NPM Atualizado (${NEW_VERSION})"
echo -e "✅ GitHub Release Criado (${NEW_VERSION}) com changelog de commits/arquivos e código compilado"
echo -e "✅ Tag de Versão Aplicada e Sincronizada\n"
