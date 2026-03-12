const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'axios') {
        return {
          filePath: path.resolve(
            __dirname,
            'node_modules/axios/dist/browser/axios.cjs',
          ),
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
