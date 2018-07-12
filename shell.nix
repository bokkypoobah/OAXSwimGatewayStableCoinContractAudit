# curl -sI https://nixos.org/channels/nixpkgs-unstable/nixexprs.tar.xz | awk '/Location:/ {print $2}'
with import (builtins.fetchTarball "https://d3g5gsiof5omrk.cloudfront.net/nixpkgs/nixpkgs-18.09pre144939.14a9ca27e69/nixexprs.tar.xz") {};

let
  nodejs = nodejs-8_x;
  nodepkgs = nodePackages_8_x;
  geth = (lib.getBin go-ethereum);
  solcBin = (lib.getBin solc);

in mkShell rec {
  buildInputs = [
    solcBin geth nodejs nodepkgs.pnpm nodepkgs.mocha
  ];

  shellHook = ''
    print_module_version="console.log(process.versions.modules)"
    export npm_config_store=''${NPM_STORE_PREFIX-$HOME}/.pnpm-store-abi-$(${nodejs}/bin/node -e $print_module_version)
    '';
}
