# Chain DSL

This Node.js package contains simple functions, which provide a more concise,
functional interface for talking to the blockchain and support writing
smart contract unit tests.

It also comes with the mandatory and convenience dependencies for
talking to the blockchain and writing unit tests for smart contracts.

This library was used across many small sub-projects before in
[an OAX monorepo](https://gitlab.com/oax/asset-gateway-poc/) and it was
intended to factor out common dependencies, so they can be upgraded
at a central location, while also providing convenince wrapper
functionality around `ganache-core` for example.

Since it was evolving quickly, it never got stable enough to be published
into any npm registry.
