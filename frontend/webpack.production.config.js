/* eslint-disable semi */
/* eslint-disable quotes */
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const CopyWebpackPlugin = require("copy-webpack-plugin");

const path = require("path");

module.exports = {
    entry: "./src/index.tsx",
    output: {
        filename: "bundle.js",
        path: path.join(__dirname, "dist.production")
    },

    mode: "production",
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },
    plugins: [
        new MiniCssExtractPlugin(),
        // new BundleAnalyzerPlugin()
        new CopyWebpackPlugin({
            patterns: [
                { from: "./index.production.html", to: "./index.production.html" },
                { from: "locales", to: "locales" }
            ]
        })
    ],

    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin(),
            new CssMinimizerPlugin()
        ]
    },

    module: {
        rules: [
            // Compile typescript.
            {
                test: /\.tsx?$/,
                use: [{
                    loader: "ts-loader",
                    options: {
                        configFile: "tsconfig.json"
                    }
                }],
                exclude: /node_modules/
            },

            // Compile scss files
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Extract the CSS into a file
                    MiniCssExtractPlugin.loader,
                    // Translates CSS into CommonJS
                    "css-loader",
                    // Compiles Sass to CSS
                    "sass-loader"
                ]
            },

            // Load plain css
            {
                test: /\.css$/,
                use: [
                    {
                        loader: "style-loader"
                    },
                    {
                        loader: "css-loader"
                    }
                ]
            },

            // Load files that should just be copied over
            {
                test: /\.(png|jpe?g|gif|svg|html)$/i,
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            name: "[name].[ext]"
                        }
                    }
                ]
            }
        ]
    },

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    externals: {
        react: "React",
        "react-dom": "ReactDOM"
    }
};
