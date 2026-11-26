# Deploy: skill.phuman.me

Same setup as `chess`: a push to `main` runs tests, builds a Docker image to GHCR,
then SSHes into the VPS and runs `docker compose up -d` in `~/skill-app`.

The app is a static site (nginx). It has **no Traefik of its own**: it joins the
`chess-app_default` Docker network and is routed by the Traefik that `~/chess-app`
already runs, which also issues the Let's Encrypt certificate. So chess must be up
for skill to be reachable.

## One-time manual steps

1. **DNS (GoDaddy, `phuman.me`)**: add an `A` record, name `skill`, value = the VPS IP
   (same IP as the `chess` record), TTL 600.
2. **GitHub repo**: create `PavelHumeniuk/skill` and push this folder to `main`.
3. **Repo secrets** (Settings → Secrets and variables → Actions → *Repository secrets*),
   same values as in the chess repo:

   | Secret | Value |
   | :--- | :--- |
   | `VPS_HOST` | VPS IP |
   | `VPS_USER` | SSH user (e.g. `root`) |
   | `VPS_SSH_KEY` | private SSH key that can log in to the VPS |

   No other secrets are needed: the deploy pulls the image with the run's own `GITHUB_TOKEN`.
4. Push to `main` and watch the **Actions** tab. On the first run Traefik requests the
   certificate; give it a minute, then open https://skill.phuman.me.

## Check on the VPS (if something fails)

```bash
docker network ls | grep chess-app_default   # must exist; created by ~/chess-app
cd ~/skill-app && docker compose ps
docker logs chess-app-traefik-1 2>&1 | grep -i skill   # certificate / routing errors
```

If the chess folder on the server isn't `~/chess-app`, its network has a different
name: put `TRAEFIK_NETWORK=<name>_default` in the workflow's `.env` line and the
`docker network inspect` check.

## Data

Skills live only in each browser's `localStorage`; the server stores nothing.
Use Settings → Export to back up.
