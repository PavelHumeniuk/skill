# Deploy: skill.phuman.me

Same idea as `chess`: a push to `main` runs tests, builds a Docker image to GHCR,
then SSHes into the VPS and runs `docker compose up -d` in `~/skill-app`.

The app is a static site (nginx). It has **no Traefik of its own**: it joins the
`chess-app_default` Docker network and is routed by the Traefik that `~/chess-app`
already runs, which also issues the Let's Encrypt certificate. So chess must be up
for skill to be reachable.

## How the deploy job talks to the server

- Plain `ssh`/`scp` on the runner, no third-party SSH actions, so the private key
  never reaches code we don't control. All other actions are pinned to commit SHAs.
- The server is verified against [`deploy/known_hosts`](deploy/known_hosts)
  (`StrictHostKeyChecking yes`). If the server is rebuilt and its host keys change,
  the deploy fails until that file is updated:
  ```bash
  ssh-keyscan -t ed25519,ecdsa,rsa 46.225.107.171 | grep -v '^#' | sort > deploy/known_hosts
  ```
  Check the fingerprints (`ssh-keygen -lf deploy/known_hosts`) against the server console first.
- [`deploy/remote-deploy.sh`](deploy/remote-deploy.sh) runs on the server. The image is
  pulled with the run's short-lived `GITHUB_TOKEN` in a throwaway Docker config.

## Repo secrets

| Secret | Value |
| :--- | :--- |
| `VPS_HOST` | `46.225.107.171` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | private key of the dedicated deploy key (below) |

## Dedicated deploy key

Use a key that exists only for this CI job, not your personal `~/.ssh/id_ed25519`:

```bash
ssh-keygen -t ed25519 -N "" -C "skill-deploy (GitHub Actions)" -f ~/.ssh/skill_deploy
ssh-copy-id -i ~/.ssh/skill_deploy.pub root@46.225.107.171
gh secret set VPS_SSH_KEY -R PavelHumeniuk/skill < ~/.ssh/skill_deploy
```

To revoke it later, delete its line (comment `skill-deploy`) from
`/root/.ssh/authorized_keys` on the server.

## DNS

GoDaddy, `phuman.me`: `A` record `skill` → `46.225.107.171`.

## Troubleshooting on the VPS

```bash
docker network ls | grep chess-app_default   # must exist; created by ~/chess-app
cd ~/skill-app && docker compose ps
docker logs chess-app-traefik-1 2>&1 | grep -i skill   # certificate / routing errors
```

## Data

Skills live only in each browser's `localStorage`; the server stores nothing.
Use Settings → Export to back up.
