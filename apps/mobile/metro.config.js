// Metro config para monorepo pnpm + Turborepo (Expo SDK 50).
// Permite que Metro resuelva los packages del workspace
// (@chronic-covid19/api-client, @chronic-covid19/shared-types) y siga los
// symlinks/hoisting de pnpm desde la raíz del monorepo.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Observar toda la raíz del monorepo (para los packages compartidos).
config.watchFolders = [workspaceRoot];

// 2. Resolver módulos tanto en node_modules local como en el de la raíz.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. En pnpm los paquetes viven en un store aislado (.pnpm) y se enlazan por
//    symlink dentro del node_modules de cada paquete. Metro (SDK 50) sigue esos
//    symlinks por defecto, así que NO se deshabilita la búsqueda jerárquica:
//    es lo que permite resolver las deps transitivas de cada dependencia.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
