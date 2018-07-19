# Stable coin

To understand the reasons behind the current smart contract design,
please refer to [doc/design.md](./doc/design.md).

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

### New, simpler contracts

The current contract hierarchy is more complicated than it should be.
It means it's more error prone and also hard to reason about.

The new, proposed structure can be seen in
[doc/contracts-hierarchy-next.puml](./doc/contracts-hierarchy-next.puml).

It aims to replace the current `Kyc.sol` with the following, currently
unused contract files:

* `AddressStatus.sol`
* `Membership.sol`
* `TokenRules.sol`

### `doc/`

This folder contains further, more detailed documentation, including some
diagrams (`*.puml` files), which are described using the
[PlantUML language](http://plantuml.com/PlantUML_Language_Reference_Guide.pdf).

You can render these diagram descriptions into `.png` or `.svg` format image
files using the [`plantuml` command](http://plantuml.com/command-line),
which has already been installed for you via the Nix package manager.

For example, you can just run:
```
plantuml -tsvg doc/contracts-hierarchy.puml
```

and on macOS you can view the resulting file with:
```
open -a 'Google Chrome' doc/contracts-hierarchy.svg
```

PlantUML has integration with many tools as documented here:
http://plantuml.com/running

Developers use the JetBrains [plugin](https://plugins.jetbrains.com/plugin/7017-plantuml-integration)
from within WebStorm or IntelliJ.

For authoring single-file diagrams, we recommend the https://www.planttext.com/
online tool.
