Converts Forta webhook to Discord webhook.

## Usage

- Create `forta-discord.yml` using `forta-discord.yml.example`
- Run `docker compose up -d`

## Description

Default port to listen on is 5001 and can be configured by environment variable `PORT`.

Store configuration at `/etc/forta-discord.yml` file e.g.:

```yaml
hooks:
  - slug: ethereum
    hook: https://discord.com/api/webhook/123
  - slug: polygon
    hook: https://discord.com/api/webhook/456
  - slug: avalanche
    hook: https://discord.com/api/webhook/789
```
