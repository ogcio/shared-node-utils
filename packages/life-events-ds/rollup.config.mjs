import commonjs from "@rollup/plugin-commonjs";
import image from "@rollup/plugin-image";
import resolve from "@rollup/plugin-node-resolve";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";
import dts from "rollup-plugin-dts";
import external from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";
import scss from "rollup-plugin-scss";
import packageJson from "./package.json" with { type: "json" };

export default [
  {
    input: ["src/index.ts"],
    output: [
      {
        file: packageJson.module,
        format: "esm",
        sourcemap: true,
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
      {
        file: packageJson.main,
        format: "cjs",
        sourcemap: true,
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    ],
    plugins: [
      external(),
      resolve(),
      copy({
        targets: [
          {
            src: "assets/*",
            dest: "dist/assets",
          },
        ],
      }),
      typescript({ tsconfig: "./tsconfig.json" }),
      terser(),
      commonjs(),
      nodeResolve({
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      }),
      postcss({
        extract: true,
        inject: true,
        plugins: [],
      }),
      image(),
    ],
    external: ["react", "react-dom"],
  },
  {
    input: "dist/esm/types/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "esm" }],
    external: [/\.(sass|scss|css)$/, "react", "react-dom"],
    plugins: [dts()],
  },
  {
    input: "styles.js",
    output: [
      {
        file: "dist/style.css",
      },
    ],
    plugins: [
      scss({
        fileName: "style.css",
        failOnError: true,
      }),
    ],
  },
];
