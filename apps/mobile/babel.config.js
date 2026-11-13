// Dexie follows a transaction across an `await` only when the `await` becomes a
// call to .then. Hermes V1 runs async functions natively, so after the first
// `await` Dexie lost the transaction. The next write went to a new transaction,
// and Dexie gave "Transaction committed too early". babel-preset-expo stopped
// this transform for Hermes V1. This config adds it again, as for Hermes V0.
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: ['@babel/plugin-transform-async-to-generator'],
  }
}
