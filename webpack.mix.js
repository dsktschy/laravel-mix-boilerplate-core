const mix = require('laravel-mix')
const fs = require('fs-extra')
const path = require('path')
const imagemin = require('imagemin')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const imageminGifsicle = require('imagemin-gifsicle')
const globby = require('globby')
const SVGSpritemapPlugin = require('svg-spritemap-webpack-plugin')
require('laravel-mix-copy-watched')

const svgDummyModuleName = 'assets/js/.svg-dummy-module'

// Clean output directory
fs.removeSync('wp-content/themes/input-theme-name/assets')
mix
  // Set output directory of mix-manifest.json
  .setPublicPath('wp-content/themes/input-theme-name')
  .js(
    'resources/themes/input-theme-name/assets/js/app.js',
    'wp-content/themes/input-theme-name/assets/js'
  )
  .sass(
    'resources/themes/input-theme-name/assets/css/app.scss',
    'wp-content/themes/input-theme-name/assets/css'
  )
  .copyWatched(
    'resources/themes/input-theme-name/assets/images/**/*.{jpg,jpeg,png,gif}',
    'wp-content/themes/input-theme-name/assets/images',
    { base: 'resources/themes/input-theme-name/assets/images' }
  )
  .version()
  .webpackConfig({
    // Prettier Loader has problem that it cause file saving one more time
    // Therefore following loaders are triggered twice
    // If this problem is not allowed,
    // you can turn off Prettier Loader by removing the following two module.rules
    // Details here: https://github.com/iamolegga/prettier-loader/issues/1
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          loader: 'prettier-loader',
          exclude: /node_modules/,
          options: { parser: 'babel' }
        },
        {
          test: /\.(scss|css)?$/,
          loader: 'prettier-loader',
          exclude: /node_modules/,
          options: { parser: 'scss' }
        }
      ]
    },
    plugins: [
      new SVGSpritemapPlugin(
        // Subdirectories (svg/**/*.svg) are not allowed
        // Because same ID attribute is output multiple times,
        // if file names are duplicated among multiple directories
        'resources/themes/input-theme-name/assets/svg/sprite/*.svg',
        {
          output: {
            filename: 'assets/svg/sprite.svg',
            // In development, keep chunk file without deletion
            // Because error occurs if chunk file has deleted when creating mix-manifest.json
            chunk: {
              name: svgDummyModuleName,
              keep: true
            },
            svgo: {
              plugins: [
                { removeTitle: true },
                { cleanupIDs: true },
                { removeAttrs: { attrs: '(fill|stroke|data.*)' } },
                { addClassesToSVGElement: { className: 'svg-sprite' } }
              ]
            },
            svg4everybody: true
          }
        }
      )
    ]
  })

if (process.env.NODE_ENV === "production") {
  mix.then(async () => {
    // Execute imagemin for each file in loop
    // Because imagemin can't keep hierarchical structure
    const targets = globby.sync(
      'wp-content/themes/input-theme-name/assets/images/**/*.{jpg,jpeg,png,gif}',
      { onlyFiles: true }
    )
    for (let target of targets) {
      console.log(`Optimizing ${target}`)
      await imagemin([ target ], path.dirname(target), {
        plugins: [
          imageminMozjpeg({ quality: 80 }),
          imageminPngquant({ quality: [ 0.65, 0.8 ] }),
          imageminGifsicle()
        ]
      }).catch(error => { throw error })
    }
    // In production, delete chunk file for SVG sprite
    fs.removeSync(`wp-content/themes/input-theme-name/${svgDummyModuleName}.js`)
    const pathToManifest = 'wp-content/themes/input-theme-name/mix-manifest.json'
    const manifest = require(`./${pathToManifest}`)
    delete manifest[`/${svgDummyModuleName}.js`]
    fs.writeFileSync(path.resolve(pathToManifest), JSON.stringify(manifest), 'utf-8')
  })
}

// Full API
// mix.js(src, output);
// mix.react(src, output); <-- Identical to mix.js(), but registers React Babel compilation.
// mix.preact(src, output); <-- Identical to mix.js(), but registers Preact compilation.
// mix.coffee(src, output); <-- Identical to mix.js(), but registers CoffeeScript compilation.
// mix.ts(src, output); <-- TypeScript support. Requires tsconfig.json to exist in the same folder as webpack.mix.js
// mix.extract(vendorLibs);
// mix.sass(src, output);
// mix.less(src, output);
// mix.stylus(src, output);
// mix.postCss(src, output, [require('postcss-some-plugin')()]);
// mix.browserSync('my-site.test');
// mix.combine(files, destination);
// mix.babel(files, destination); <-- Identical to mix.combine(), but also includes Babel compilation.
// mix.copy(from, to);
// mix.copyDirectory(fromDir, toDir);
// mix.minify(file);
// mix.sourceMaps(); // Enable sourcemaps
// mix.version(); // Enable versioning.
// mix.disableNotifications();
// mix.setPublicPath('path/to/public');
// mix.setResourceRoot('prefix/for/resource/locators');
// mix.autoload({}); <-- Will be passed to Webpack's ProvidePlugin.
// mix.webpackConfig({}); <-- Override webpack.config.js, without editing the file directly.
// mix.babelConfig({}); <-- Merge extra Babel configuration (plugins, etc.) with Mix's default.
// mix.then(function () {}) <-- Will be triggered each time Webpack finishes building.
// mix.dump(); <-- Dump the generated webpack config object t the console.
// mix.extend(name, handler) <-- Extend Mix's API with your own components.
// mix.options({
//   extractVueStyles: false, // Extract .vue component styling to file, rather than inline.
//   globalVueStyles: file, // Variables file to be imported in every component.
//   processCssUrls: true, // Process/optimize relative stylesheet url()'s. Set to false, if you don't want them touched.
//   purifyCss: false, // Remove unused CSS selectors.
//   terser: {}, // Terser-specific options. https://github.com/webpack-contrib/terser-webpack-plugin#options
//   postCss: [] // Post-CSS options: https://github.com/postcss/postcss/blob/master/docs/plugins.md
// });
