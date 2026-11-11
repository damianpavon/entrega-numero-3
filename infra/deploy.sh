#!/usr/bin/env bash
# =====================================================================
# deploy.sh - Script de despliegue de la Carta Digital (3ra entrega)
#
# Automatiza, en este orden:
#   1) crea los CONTENEDORES (docker build: frontend Nginx + backend Node.js)
#   2) crea el DESPLIEGUE de la app (docker compose local, o Auto Scaling Group en AWS)
#   3) crea la BASE DE DATOS (contenedor PostgreSQL local, o RDS en AWS; el esquema
#      lo aplica la propia app al arrancar con RUN_MIGRATIONS=true)
#   4) crea TODA la infraestructura AWS como código (CloudFormation: RDS, Load Balancer,
#      Auto Scaling, roles, secretos)
# Lo ÚNICO manual es Cloudflare (DNS/HTTPS): al final el script imprime qué hacer.
#
# Uso:
#   ./infra/deploy.sh dev                 # local, ambiente Desarrollo
#   ./infra/deploy.sh qa                  # local, ambiente QA
#   ./infra/deploy.sh prod                # local, Producción (1 servidor)  [usa --profile db-local con DB_LOCAL=1]
#   ./infra/deploy.sh qa   --aws          # AWS, ambiente QA
#   ./infra/deploy.sh prod --aws          # AWS, ambiente Producción
#   ./infra/deploy.sh qa   --aws --destroy  # elimina el stack de AWS
#
# Variables opcionales (AWS): AWS_REGION, VPC_ID, SUBNET_IDS (a,b), CERTIFICATE_ARN,
#                             IMAGE_TAG, MIN_SIZE, MAX_SIZE
# =====================================================================
set -euo pipefail

AMBIENTE="${1:-}"; shift || true
MODO="local"; DESTRUIR="no"
for arg in "$@"; do
  case "$arg" in
    --aws) MODO="aws" ;;
    --destroy) DESTRUIR="si" ;;
    *) echo "Opción desconocida: $arg" >&2; exit 1 ;;
  esac
done

case "$AMBIENTE" in dev|qa|prod) ;; *)
  echo "Uso: $0 <dev|qa|prod> [--aws] [--destroy]" >&2; exit 1 ;;
esac

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

paso()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
falla() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
necesita() { command -v "$1" >/dev/null 2>&1 || falla "Falta '$1' en el PATH."; }

# ---------------------------------------------------------------------
# MODO LOCAL: contenedor + despliegue + BD con docker compose
# ---------------------------------------------------------------------
desplegar_local() {
  necesita docker
  local envfile="docker/env/${AMBIENTE}.env"
  local compose="docker/docker-compose.${AMBIENTE}.yml"

  if [[ ! -f "$envfile" ]]; then
    if [[ "$AMBIENTE" == "dev" ]]; then
      cp "docker/env/dev.env.example" "$envfile"
      echo "Creado $envfile desde el ejemplo."
    else
      falla "Falta $envfile. Copia docker/env/${AMBIENTE}.env.example, cambia los secretos y vuelve a ejecutar."
    fi
  fi
  # Producción nunca debe usar los valores de ejemplo
  if [[ "$AMBIENTE" != "dev" ]] && grep -q "CAMBIAR" "$envfile"; then
    falla "$envfile todavía tiene valores 'CAMBIAR'. Define secretos reales (openssl rand -hex 32)."
  fi

  local perfil=()
  [[ "$AMBIENTE" == "prod" && "${DB_LOCAL:-0}" == "1" ]] && perfil=(--profile db-local)

  paso "1-3) Construyendo imágenes y levantando frontend + backend + base de datos ($AMBIENTE)"
  docker compose --env-file "$envfile" -f "$compose" ${perfil[@]+"${perfil[@]}"} up -d --build

  paso "Estado"
  docker compose --env-file "$envfile" -f "$compose" ${perfil[@]+"${perfil[@]}"} ps
  local puerto=3000; [[ "$AMBIENTE" == "qa" ]] && puerto=3001; [[ "$AMBIENTE" == "prod" ]] && puerto=80  # puerto del FRONTEND
  echo "App: http://localhost:${puerto}   |   salud: http://localhost:${puerto}/health"
}

# ---------------------------------------------------------------------
# MODO AWS: ECR + imagen + CloudFormation (todo como código)
# ---------------------------------------------------------------------
desplegar_aws() {
  [[ "$AMBIENTE" == "dev" ]] && falla "El ambiente dev es solo local. Usa qa o prod con --aws."
  necesita aws; necesita docker
  aws sts get-caller-identity >/dev/null 2>&1 || falla "AWS CLI sin credenciales (aws configure / aws sso login)."

  local region="${AWS_REGION:-$(aws configure get region || true)}"
  [[ -n "$region" ]] || falla "Define AWS_REGION (p. ej. export AWS_REGION=us-east-1)."
  local cuenta; cuenta="$(aws sts get-caller-identity --query Account --output text)"
  local stack="carta-digital-${AMBIENTE}"
  local repo_back="carta-digital-backend-${AMBIENTE}"
  local repo_front="carta-digital-frontend-${AMBIENTE}"
  local registro="${cuenta}.dkr.ecr.${region}.amazonaws.com"

  if [[ "$DESTRUIR" == "si" ]]; then
    paso "Eliminando stack $stack"
    aws cloudformation delete-stack --region "$region" --stack-name "$stack"
    aws cloudformation wait stack-delete-complete --region "$region" --stack-name "$stack"
    echo "Stack eliminado (la BD deja un snapshot final). Los repositorios ECR se conservan."
    return
  fi

  paso "1) Repositorios ECR y construcción de los contenedores (backend y frontend)"
  local tag="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
  aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$registro"
  publicar_imagen() {   # $1=repositorio  $2=carpeta con Dockerfile  $3..=opciones de docker build
    local repo="$1" carpeta="$2"; shift 2
    aws ecr describe-repositories --region "$region" --repository-names "$repo" >/dev/null 2>&1 \
      || aws ecr create-repository --region "$region" --repository-name "$repo" \
           --image-scanning-configuration scanOnPush=true --encryption-configuration encryptionType=AES256 >/dev/null
    if aws ecr describe-images --region "$region" --repository-name "$repo" --image-ids imageTag="$tag" >/dev/null 2>&1; then
      # Misma etiqueta ya publicada (p. ej. rollback con IMAGE_TAG=...): se reutiliza, no se reconstruye.
      echo "La imagen $repo:$tag ya existe en ECR; se reutiliza sin reconstruir."
    else
      docker build "$@" -t "${registro}/${repo}:${tag}" "$carpeta"
      docker push "${registro}/${repo}:${tag}"
    fi
  }
  publicar_imagen "$repo_back"  backend  --target prod
  publicar_imagen "$repo_front" frontend
  local imagen_back="${registro}/${repo_back}:${tag}"
  local imagen_front="${registro}/${repo_front}:${tag}"

  paso "2) Red: VPC y subredes"
  local vpc="${VPC_ID:-$(aws ec2 describe-vpcs --region "$region" --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)}"
  [[ "$vpc" != "None" && -n "$vpc" ]] || falla "No hay VPC por defecto. Define VPC_ID y SUBNET_IDS."
  local subnets="${SUBNET_IDS:-$(aws ec2 describe-subnets --region "$region" --filters Name=vpc-id,Values="$vpc" Name=default-for-az,Values=true \
        --query 'Subnets[].SubnetId' --output text | tr '\t' ',')}"
  [[ "$subnets" == *,* ]] || falla "Se necesitan al menos 2 subredes (SUBNET_IDS=subnet-a,subnet-b)."
  echo "VPC: $vpc | Subredes: $subnets"

  paso "3-4) Infraestructura como código: RDS + Auto Scaling + Load Balancer (CloudFormation)"
  local semilla="false"; [[ "$AMBIENTE" == "qa" ]] && semilla="true"
  local prot="false";    [[ "$AMBIENTE" == "prod" ]] && prot="true"
  local multi="false";   [[ "$AMBIENTE" == "prod" ]] && multi="true"
  aws cloudformation deploy --region "$region" \
    --stack-name "$stack" \
    --template-file infra/aws/carta-digital.yml \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
        Ambiente="$AMBIENTE" VpcId="$vpc" SubnetIds="$subnets" BackendImageUri="$imagen_back" FrontendImageUri="$imagen_front" \
        SeedDemo="$semilla" DbDeletionProtection="$prot" DbMultiAz="$multi" \
        MinSize="${MIN_SIZE:-1}" MaxSize="${MAX_SIZE:-3}" \
        CertificateArn="${CERTIFICATE_ARN:-}"

  paso "Resultado"
  aws cloudformation describe-stacks --region "$region" --stack-name "$stack" \
    --query 'Stacks[0].Outputs' --output json | tee infra/aws/outputs.json
  local alb; alb="$(aws cloudformation describe-stacks --region "$region" --stack-name "$stack" \
    --query "Stacks[0].Outputs[?OutputKey=='AlbDnsName'].OutputValue" --output text)"

  cat <<MSG

------------------------------------------------------------------
PASO MANUAL: CLOUDFLARE  (DNS + HTTPS)
  1. Cloudflare > tu dominio > DNS > Add record:
       Tipo CNAME | Nombre: carta (o @) | Destino: ${alb} | Proxy: activado (nube naranja)
  2. SSL/TLS > Overview: modo "Full (strict)" si desplegaste con CERTIFICATE_ARN;
     si no, "Flexible" (solo QA: el tramo Cloudflare->AWS irá sin cifrar).
  3. SSL/TLS > Edge Certificates: activar "Always Use HTTPS".
  4. Verifica: https://carta.tudominio.cl/health  ->  {"status":"ok"}
------------------------------------------------------------------
MSG
}

if [[ "$MODO" == "aws" ]]; then desplegar_aws; else desplegar_local; fi
