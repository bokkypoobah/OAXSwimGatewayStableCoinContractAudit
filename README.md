# Stable coin

## Setup

Prerequisite on both macOS and Linux:
- [Nix 2.0](https://nixos.org/nix/) package manager

Node.js dependencies are managed outside of Nix, using the
[pnpm](https://pnpm.js.org/) package manager.

```bash
nix-shell
pnpm recursive link
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
  "_other_remoteNode": "http://some.other.ethereum.node:8545"
}
```

Since you can't use comments in JSON files, you can just use some prefixed
keys, in case you want to switch between different values of an option, as
shown with the `_other_remoteNode` example demonstrates it.

## Project structure

### `chain-dsl/`

This folder is a Node.js package containing simple functions, which provide
a more concise, functional interface for talking to the blockchain and
writing unit tests.

Further documentation can be found under
[chain-dsl/README.md](./chain-dsl/README.md).

### `chain/`

This folder contains the smart contracts for the fiat-crypto gateway system,
together with automated tests and utilities for deployment, usage and
maintenance/evolution.

Further documentation can be found under
[chain/README.md](./chain/README.md).
