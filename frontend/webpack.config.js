/* eslint-disable semi */
/* eslint-disable quotes */
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: "./src/index.tsx",
    output: {
        filename: "bundle.js",
        path: path.join(__dirname, "dist")
    },

    mode: "development",

    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },
    plugins: [
        new MiniCssExtractPlugin(),
        new CopyPlugin({
            patterns: [
                { from: "locales", to: "locales" }
            ]
        })
    ],

    devServer: {
        allowedHosts: "all",
        devMiddleware: {
            publicPath: "/dist/"
        },
        static: {
            directory: path.join(__dirname, "dist")
        },
        historyApiFallback: true,
        // watchFiles: "/dist",
        hot: true
    },

    module: {
        rules: [
            // Compile typescript.
            {
                test: /\.tsx?$/,
                use: [{
                    loader: process.env.babel === "true" ? "babel-loader" : "ts-loader"
                }],
                exclude: /node_modules/
            },

            /* // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            {
                enforce: "pre",
                test: /\.js$/,
                loader: "source-map-loader",
                exclude: [
                    // These modules have broken source maps
                    /react-rte/,
                ],
            }, */

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
            },

            // Load json files
            {
                test: /\.json$/,
                type: "json"
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
