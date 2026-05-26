module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
            "@api": "./src/api",
            "@store": "./src/store",
            "@screens": "./src/screens",
            "@components": "./src/components",
            "@hooks": "./src/hooks",
            "@utils": "./src/utils",
            "@i18n": "./src/i18n",
            "@navigation": "./src/navigation",
            "@theme": "./src/theme",
            "@t": "./src/types",
          },
        },
      ],
    ],
  };
};
