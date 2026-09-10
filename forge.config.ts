
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config = {
  outDir: 'out-1.0.4',
  packagerConfig: {
    asar: true,
    name: 'Getting Stuff Done',
    executableName: 'Getting Stuff Done',
    ignore: (file: string) => !!file && file !== '/package.json' && file !== '/.vite' && !file.startsWith('/.vite/')
  },
  makers: [new MakerSquirrel({}), new MakerZIP({}, ['win32'])],
  plugins: [new VitePlugin({
    build: [
      { entry: 'src/main.ts', config: 'vite.main.config.ts', target: 'main' },
      { entry: 'src/preload.ts', config: 'vite.preload.config.ts', target: 'preload' }
    ],
    renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }]
  })]
};
export default config;
