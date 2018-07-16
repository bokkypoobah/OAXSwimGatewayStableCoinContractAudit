# Stable coin

## Setup

Prerequisite on both macOS and Linux:
- [Nix 2.0](https://nixos.org/nix/) package manager

```bash
nix-shell
pnpm recursive install
cd chain/
pnpm test --watch
```

You can create a `chain/config/local.json` file if you want to specify a custom
blockchain node or you want to use a different mnemonic which has accounts with
enough ETH balance for example. This file is ignored by version control.
Example content might look like:

```
{
  "mnemonic": "your 12 words ...",
  "remoteNode": "http://localhost:8900",
  "_other_remoteNode": "http://localhost:8900"
}

```

Since you can't use comments in JSON files, you can just use some prefixed
keys, in case you want to switch between different values of an option, as
shown with the `_other_remoteNode` example demonstrates it.
