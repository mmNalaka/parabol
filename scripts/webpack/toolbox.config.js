const path = require('path')
const nodeExternals = require('webpack-node-externals')
const transformRules = require('./utils/transformRules')

const PROJECT_ROOT = path.join(__dirname, '..', '..')
const CLIENT_ROOT = path.join(PROJECT_ROOT, 'packages', 'client')
const SERVER_ROOT = path.join(PROJECT_ROOT, 'packages', 'server')
const DOTENV = path.join(PROJECT_ROOT, 'scripts/webpack/utils/dotenv.js')
const TOOLBOX_SRC = path.join(PROJECT_ROOT, 'scripts/toolboxSrc')
// const CircularDependencyPlugin = require('circular-dependency-plugin')

// move __generated__ outside of src
module.exports = {
  stats: 'minimal',
  devtool: 'eval',
  mode: 'none',
  node: {
    __dirname: false
  },
  entry: {
    updateSchema: path.join(SERVER_ROOT, 'utils', 'updateGQLSchema.ts'),
    migrateDB: [DOTENV, path.join(TOOLBOX_SRC, 'migrate.ts')],
    createMigration: [DOTENV, path.join(TOOLBOX_SRC, 'migrate-create.ts')],
    postDeploy: path.join(TOOLBOX_SRC, 'postDeploy.ts')
  },
  output: {
    filename: '[name].js',
    path: path.join(PROJECT_ROOT, 'scripts', 'toolbox'),
    libraryTarget: 'commonjs',
  },
  resolve: {
    alias: {
      '~': path.join(CLIENT_ROOT),
      'parabol-server': SERVER_ROOT,
      'parabol-client': CLIENT_ROOT,
    },
    extensions: ['.js', '.json', '.ts', '.tsx'],
    unsafeCache: true,
    // this is run outside the server dir, but we want to favor using modules from the server dir
    modules: [path.resolve(SERVER_ROOT, '../node_modules'), 'node_modules']
  },
  resolveLoader: {
    modules: [path.resolve(SERVER_ROOT, '../node_modules'), 'node_modules']
  },
  target: 'node',
  externals: [
    nodeExternals({
      whitelist: [/parabol-client/, '/parabol-server/']
    })
  ],
  module: {
    rules: [
      ...transformRules(PROJECT_ROOT),
      {
        test: /\.js$/,
        include: [path.join(SERVER_ROOT), path.join(CLIENT_ROOT)],
        use: [
          {
            loader: '@sucrase/webpack-loader',
            options: {
              transforms: ['jsx']
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        use: ['ignore-loader']
      }
    ]
  }
}
