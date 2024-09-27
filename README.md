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

### Finding object

```typescript
type FindingV2 = {
  name: string;
  description: string;
  alertId: string;
  severity: string;
  type: string;
  metadata: { [key: string]: string };
  addresses: string[];
  labels: Label[];
  uniqueKey: string;
  source: {
    chains?: { chainId: number }[];
    blocks?: {
      chainId: number;
      hash: string;
      number: number;
    }[];
    transactions?: {
      chainId: number;
      hash: string;
    }[];
    urls?: { url: string }[];
    alerts?: { id: string }[];
    customSources?: { name: string; value: string; }[];
  };
  timestamp: string;
}
```
