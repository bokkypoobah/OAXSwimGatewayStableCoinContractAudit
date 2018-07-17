# curl -sI https://nixos.org/channels/nixpkgs-unstable/nixexprs.tar.xz | awk '/Location:/ {print $2}'
with import (builtins.fetchTarball "https://d3g5gsiof5omrk.cloudfront.net/nixpkgs/nixpkgs-18.09pre146263.d1eaa5b6510/nixexprs.tar.xz") {};

let
  nodejs = nodejs-8_x;
  nodepkgs = nodePackages_8_x;

  solc-0_4_23-tree-url = https://github.com/nixos/nixpkgs/archive/bd991be8d3cf62cc3b6c704ed0cd21b75f1ddd8a.tar.gz;
  solc-0_4_23 = ((import (builtins.fetchTarball solc-0_4_23-tree-url) {}).solc);

  solc23 = pkgs.runCommand "solc-0.4.23-wrapper" {} ''
    mkdir -p $out/bin
    echo '#!${stdenv.shell}' > $out/bin/solc23
    echo 'exec ${solc-0_4_23}/bin/solc "$@"' >> $out/bin/solc23
    chmod +x $out/bin/solc23
  '';

in mkShell rec {
  buildInputs = [
    solc solc23 go-ethereum nodejs nodepkgs.pnpm nodepkgs.mocha
  ];

  shellHook = ''
    print_module_version="console.log(process.versions.modules)"
    export npm_config_store=''${NPM_STORE_PREFIX-$HOME}/.pnpm-store-abi-$(${nodejs}/bin/node -e $print_module_version)
    '';
}
