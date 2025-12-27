{
  description = "Universal skills loader for AI coding agents";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          packageJson = pkgs.lib.importJSON ./package.json;
          nodejs = pkgs.nodejs_22;
        in
        {
          default = pkgs.buildNpmPackage (finalAttrs: {
            pname = "openskills";
            version = packageJson.version;
            src = ./.;

            # Update this hash when package-lock.json changes:
            # nix build 2>&1 | grep 'got:' | awk '{print $2}'
            npmDepsHash = "sha256-unmxbQHOHsKF0mGCPP1eSe2H1cm7nMsTwObkF9MN2yQ=";

            inherit nodejs;

            buildPhase = ''
              runHook preBuild
              npm run build
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              mkdir -p $out/lib/openskills
              cp -r dist $out/lib/openskills/
              cp -r node_modules $out/lib/openskills/
              cp package.json $out/lib/openskills/

              mkdir -p $out/bin
              makeWrapper ${nodejs}/bin/node $out/bin/openskills \
                --add-flags "$out/lib/openskills/dist/cli.js"

              runHook postInstall
            '';

            nativeBuildInputs = [ pkgs.makeWrapper ];

            meta = with pkgs.lib; {
              description = packageJson.description;
              homepage = "https://github.com/numman-ali/openskills";
              license = licenses.asl20;
              mainProgram = "openskills";
            };
          });
        }
      );

      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          nodejs = pkgs.nodejs_22;
        in
        {
          default = pkgs.mkShell {
            buildInputs = [
              nodejs
              pkgs.git
            ];

            shellHook = ''
              echo "OpenSkills development shell"
              echo "Node.js: $(node --version)"
              echo "npm: $(npm --version)"
            '';
          };
        }
      );

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/openskills";
        };
      });
    };
}
