const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

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
      if (moduleName.endsWith('.png') || moduleName.endsWith('.jpg') || moduleName.endsWith('.gif')) {
        return context.resolveRequest(
          {...context, resolveRequest: undefined},
          moduleName,
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
