#!/usr/bin/env bash
# Check the Cloudflare API token, and stop if the Pages project is missing.
# Prints "url=https://<subdomain>" for $GITHUB_OUTPUT. Errors go to stderr.
#   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pages-project.sh <project>
set -euo pipefail
project="$1"
: "${CLOUDFLARE_API_TOKEN:?is not set}" "${CLOUDFLARE_ACCOUNT_ID:?is not set}"
api="https://api.cloudflare.com/client/v4"
auth="Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"

# A user token answers at /user/tokens/verify; an account token at the account path.
ok=false
for path in "/user/tokens/verify" "/accounts/${CLOUDFLARE_ACCOUNT_ID}/tokens/verify"; do
  if curl --silent --header "$auth" "$api$path" | jq -e '.success and .result.status == "active"' >/dev/null; then
    ok=true
    break
  fi
done
if [ "$ok" != true ]; then
  echo "The Cloudflare token does not verify. Use an API token (not the Global API Key)" >&2
  echo "with the permission Account > Cloudflare Pages > Edit. Cloudflare said:" >&2
  curl --silent --header "$auth" "$api/user/tokens/verify" | jq -c '.errors' >&2
  exit 1
fi

status="$(curl --silent --output project.json --write-out '%{http_code}' --header "$auth" \
  "$api/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${project}")"
# A missing project is an error. A rename in the dashboard changes the name, so a
# new project here takes the deploys away from the custom domain.
if [ "$status" = 404 ]; then
  echo "The Pages project ${project} does not exist." >&2
  echo "If you renamed the project, change PROJECT in .github/workflows/deploy.yml." >&2
  echo "For a new site, make the project first:" >&2
  echo "  npx wrangler pages project create ${project} --production-branch=main" >&2
  exit 1
elif [ "$status" != 200 ]; then
  echo "The lookup of the Pages project returned ${status}:" >&2
  jq -c '.errors' project.json >&2 || cat project.json >&2
  exit 1
fi
# Pages adds a suffix when the name is taken, so print the real subdomain.
echo "url=https://$(jq -r .result.subdomain project.json)"
