#!/bin/bash

set -e
set -o pipefail

VERDE='\033[0;32m'
VERMELHO='\033[0;31m'
AMARELO='\033[1;33m'
AZUL='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${VERDE}[INFO]${NC} $1"; }
log_warn() { echo -e "${AMARELO}[AVISO]${NC} $1"; }
log_error() { echo -e "${VERMELHO}[ERRO]${NC} $1"; }
log_step() { echo -e "\n${AZUL}>>>>> $1 <<<<<${NC}"; }

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    *)
      log_error "Argumento inválido: $arg"
      log_info "Uso: ./scripts/release.sh [--dry-run]"
      exit 1
      ;;
  esac
done

if [ -f .env ]; then
  log_info "Carregando variáveis do arquivo .env..."
  set -a
  source .env
  set +a
fi

if ! command -v jq &> /dev/null; then
  log_error "O comando 'jq' é necessário (ex: sudo apt install jq)."
  exit 1
fi

REPO_URL=$(jq -r '.repository.url' package.json | sed -E 's|git\+https://github.com/||g' | sed 's|\.git||')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
PACKAGE_NAME=$(jq -r '.name' package.json)
PACKAGE_SCOPE=$(echo "$PACKAGE_NAME" | sed -n 's/^@\([^/]*\)\/.*/\1/p')

if [ -z "$PACKAGE_SCOPE" ]; then
  log_error "O pacote em package.json precisa ser escopado (@owner/nome)."
  exit 1
fi

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  log_warn "Você está na branch '$CURRENT_BRANCH'. Recomendado: main/master."
  read -p "Deseja continuar? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

if ! git diff-index --quiet HEAD --; then
  log_error "Há alterações locais não commitadas. Faça commit/stash antes da release para evitar perda de trabalho."
  exit 1
fi

if [ "$DRY_RUN" = false ]; then
  GITHUB_TOKEN="${GITHUB_TOKEN:-}"
  NPM_TOKEN="${NPM_TOKEN:-}"

  if [ -z "$GITHUB_TOKEN" ]; then
    log_error "GITHUB_TOKEN não está definido."
    exit 1
  fi

  if [ -z "$NPM_TOKEN" ]; then
    log_error "NPM_TOKEN não está definido."
    exit 1
  fi
fi

RELEASE_COMMIT_CREATED=false
RELEASE_TAG_CREATED=false
RELEASE_TAG_PUSHED=false
RELEASE_COMMIT_PUSHED=false
NEW_VERSION=""

rollback() {
  log_step "ERRO DETECTADO - INICIANDO ROLLBACK SEGURO"

  rm -f .npmrc_temp .npmrc_github_temp release_assets.tar.gz package.tmp.json

  if [ "$RELEASE_TAG_CREATED" = true ] && git rev-parse "v${NEW_VERSION}" >/dev/null 2>&1; then
    git tag -d "v${NEW_VERSION}" || true
  fi

  if [ "$RELEASE_COMMIT_CREATED" = true ]; then
    git reset --soft HEAD~1 || true
    log_warn "Commit de release foi desfeito localmente com reset --soft (sem perder conteúdo)."
  fi

  if [ "$RELEASE_TAG_PUSHED" = true ]; then
    log_warn "Tag remota v${NEW_VERSION} pode já ter sido enviada. Tentando remover..."
    git push --delete origin "v${NEW_VERSION}" || log_warn "Não foi possível remover a tag remota."
  fi

  if [ "$RELEASE_COMMIT_PUSHED" = true ]; then
    log_warn "Commit remoto já pode ter sido enviado. Reversão remota automática não será feita."
  fi

  log_error "Rollback finalizado com estratégia não destrutiva."
  exit 1
}

trap 'rollback' ERR

log_step "Calculando Nova Versão"
CURRENT_VERSION=$(jq -r '.version' package.json)
log_info "Versão Atual: $CURRENT_VERSION"

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
if [ "$PATCH" -ge 9 ]; then
  NEW_MINOR=$((MINOR + 1))
  NEW_PATCH=0
  NEW_VERSION="$MAJOR.$NEW_MINOR.$NEW_PATCH"
else
  NEW_PATCH=$((PATCH + 1))
  NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
fi
log_info "Nova Versão Calculada: $NEW_VERSION"

log_step "Gerando Notas de Lançamento"
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
  COMMITS_LOG=$(git log --oneline | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  CHANGED_FILES=$(git log --name-only --oneline | grep -v '^[a-z0-9]' | sort -u | grep -v '^$' | awk '{print "- " $0}' | sed ':a;N;$!ba;s/\n/\\n/g')
else
  COMMITS_LOG=$(git log ${LAST_TAG}..HEAD --oneline | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  CHANGED_FILES=$(git diff --name-only ${LAST_TAG}..HEAD | awk '{print "- " $0}' | sed ':a;N;$!ba;s/\n/\\n/g')
fi
RELEASE_NOTES="### Commits (desde ${LAST_TAG:-inicio}):\n${COMMITS_LOG}\n\n### Arquivos Alterados:\n${CHANGED_FILES}"

if [ "$DRY_RUN" = false ]; then
  log_step "Validando Tokens de Acesso"

  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token ${GITHUB_TOKEN}" https://api.github.com/user)
  if [ "$HTTP_STATUS" != "200" ]; then
    log_error "GITHUB_TOKEN inválido/expirado. HTTP $HTTP_STATUS"
    exit 1
  fi

  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc_temp
  if ! npm whoami --userconfig .npmrc_temp &> /dev/null; then
    log_error "NPM_TOKEN inválido ou sem permissão de publicação."
    exit 1
  fi

  {
    echo "@${PACKAGE_SCOPE}:registry=https://npm.pkg.github.com"
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}"
    echo "always-auth=true"
  } > .npmrc_github_temp

  if ! npm whoami --registry https://npm.pkg.github.com --userconfig .npmrc_github_temp &> /dev/null; then
    log_error "GITHUB_TOKEN sem permissão para GitHub Packages."
    exit 1
  fi
fi

log_step "Build e Empacotamento"
npm ci
npm run lint
npm run typecheck
npm run build

if [ "$DRY_RUN" = true ]; then
  log_step "Dry Run"
  log_info "Dry-run ativo: sem alteração de versão, sem commit/tag/publish/push/release."
  npm pack --dry-run > /dev/null
  log_info "Empacotamento validado com sucesso. Próxima versão sugerida: $NEW_VERSION"
  rm -f .npmrc_temp .npmrc_github_temp release_assets.tar.gz package.tmp.json
  trap - ERR
  exit 0
fi

jq ".version = \"$NEW_VERSION\"" package.json > package.tmp.json && mv package.tmp.json package.json

tar -czf release_assets.tar.gz dist/ package.json

git add package.json package-lock.json
git commit -m "chore(release): versão $NEW_VERSION"
RELEASE_COMMIT_CREATED=true

git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
RELEASE_TAG_CREATED=true

log_step "Publicando no NPM"
npm publish --userconfig .npmrc_temp --access public

log_step "Publicando no GitHub Packages"
npm publish --registry https://npm.pkg.github.com --userconfig .npmrc_github_temp

rm -f .npmrc_temp .npmrc_github_temp

log_step "Push e GitHub Release"
git push origin "$CURRENT_BRANCH"
RELEASE_COMMIT_PUSHED=true

git push origin "v${NEW_VERSION}"
RELEASE_TAG_PUSHED=true

API_PAYLOAD="{\"tag_name\":\"v${NEW_VERSION}\",\"target_commitish\":\"${CURRENT_BRANCH}\",\"name\":\"Release v${NEW_VERSION}\",\"body\":\"${RELEASE_NOTES}\",\"draft\":false,\"prerelease\":false}"

RELEASE_RESPONSE=$(curl -s -X POST "https://api.github.com/repos/${REPO_URL}/releases" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d "$API_PAYLOAD")

RELEASE_ID=$(echo "$RELEASE_RESPONSE" | jq -r .id)
if [ "$RELEASE_ID" = "null" ] || [ -z "$RELEASE_ID" ]; then
  ERROR_MSG=$(echo "$RELEASE_RESPONSE" | jq -r .message)
  log_error "Falha ao criar release no GitHub: $ERROR_MSG"
  false
fi

UPLOAD_URL="https://uploads.github.com/repos/${REPO_URL}/releases/${RELEASE_ID}/assets?name=release_dist.tar.gz"
HTTP_STATUS_UPLOAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$UPLOAD_URL" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Content-Type: application/gzip" \
  --data-binary @"release_assets.tar.gz")

if [ "$HTTP_STATUS_UPLOAD" != "201" ]; then
  log_warn "Release criada, mas falhou upload do asset (HTTP $HTTP_STATUS_UPLOAD)."
else
  log_info "Upload do asset concluído."
fi

rm -f release_assets.tar.gz
trap - ERR
log_info "Release v${NEW_VERSION} finalizada com sucesso."
